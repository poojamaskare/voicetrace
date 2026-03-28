import { NextRequest } from "next/server";
import Groq from "groq-sdk";
import { ChatCompletionMessageParam } from "groq-sdk/resources/chat/completions";
import { createClient } from "@supabase/supabase-js";

interface ChatMessageInput {
  role: "user" | "assistant";
  content: string;
}

interface SalesRow {
  id: string;
  date: string;
  total: number;
  items: Array<{
    name?: string;
    qty?: number;
    price?: number;
    total?: number;
    type?: string;
  }>;
}

interface ExpenseRow {
  id: string;
  date: string;
  amount: number;
  category: string;
  description: string | null;
}

interface ChatMessageRow {
  role: "user" | "assistant" | "system";
  content: string;
  mode: "chat" | "voice";
  created_at: string;
}

interface DbFetchMeta {
  connected: boolean;
  keyType: "service_role" | "anon" | "missing";
  salesCount: number;
  expensesCount: number;
  sessionMessagesCount: number;
  errors: string[];
}

interface DbContextResult {
  context: ReturnType<typeof toCompactDbContext> | null;
  meta: DbFetchMeta;
}

function toCompactDbContext(input: {
  sales: SalesRow[];
  expenses: ExpenseRow[];
  sessionMessages: ChatMessageRow[];
}) {
  const totalSales = input.sales.reduce(
    (sum, row) => sum + (Number(row.total) || 0),
    0,
  );
  const totalExpenses = input.expenses.reduce(
    (sum, row) => sum + (Number(row.amount) || 0),
    0,
  );

  const itemRevenue: Record<string, number> = {};
  for (const sale of input.sales) {
    for (const item of sale.items ?? []) {
      if (item.type !== "sale") continue;
      const name = (item.name || "Unknown").trim();
      const value = Number(item.total) || 0;
      itemRevenue[name] = (itemRevenue[name] || 0) + value;
    }
  }

  const topItems = Object.entries(itemRevenue)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, amount]) => ({ name, amount }));

  return {
    period_days: 30,
    totals: {
      sales: totalSales,
      expenses: totalExpenses,
      net: totalSales - totalExpenses,
    },
    recent_sales: input.sales
      .slice(0, 5)
      .map((s) => ({ date: s.date, total: s.total })),
    recent_expenses: input.expenses.slice(0, 5).map((e) => ({
      date: e.date,
      amount: e.amount,
      category: e.category,
      description: e.description,
    })),
    top_sale_items: topItems,
    current_session_recent_messages: input.sessionMessages
      .slice(-8)
      .map((m) => ({
        role: m.role,
        mode: m.mode,
        content: m.content,
        created_at: m.created_at,
      })),
  };
}

async function fetchDbContext(sessionId?: string): Promise<DbContextResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || (!supabaseServiceRole && !supabaseAnonKey)) {
    return {
      context: null,
      meta: {
        connected: false,
        keyType: "missing",
        salesCount: 0,
        expensesCount: 0,
        sessionMessagesCount: 0,
        errors: ["Supabase env vars missing"],
      },
    };
  }

  const key = supabaseServiceRole || supabaseAnonKey!;
  const keyType: DbFetchMeta["keyType"] = supabaseServiceRole
    ? "service_role"
    : "anon";
  const supabase = createClient(supabaseUrl, key);

  const rpcRes = await supabase.rpc("get_chat_db_context", {
    p_session_id: sessionId ?? null,
    p_days: 30,
  });

  if (!rpcRes.error && rpcRes.data) {
    const contextFromRpc = rpcRes.data as ReturnType<typeof toCompactDbContext>;
    return {
      context: contextFromRpc,
      meta: {
        connected: true,
        keyType,
        salesCount: Array.isArray(
          (contextFromRpc as { recent_sales?: unknown[] }).recent_sales,
        )
          ? ((contextFromRpc as { recent_sales?: unknown[] }).recent_sales
              ?.length ?? 0)
          : 0,
        expensesCount: Array.isArray(
          (contextFromRpc as { recent_expenses?: unknown[] }).recent_expenses,
        )
          ? ((contextFromRpc as { recent_expenses?: unknown[] }).recent_expenses
              ?.length ?? 0)
          : 0,
        sessionMessagesCount: Array.isArray(
          (contextFromRpc as { current_session_recent_messages?: unknown[] })
            .current_session_recent_messages,
        )
          ? ((contextFromRpc as { current_session_recent_messages?: unknown[] })
              .current_session_recent_messages?.length ?? 0)
          : 0,
        errors: [],
      },
    };
  }

  const now = new Date();
  const from = new Date(now);
  from.setDate(now.getDate() - 30);
  const fromDate = from.toISOString().slice(0, 10);

  const salesPromise = supabase
    .from("sales")
    .select("id, date, total, items")
    .gte("date", fromDate)
    .order("date", { ascending: false })
    .limit(50);

  const expensesPromise = supabase
    .from("expenses")
    .select("id, date, amount, category, description")
    .gte("date", fromDate)
    .order("date", { ascending: false })
    .limit(50);

  const sessionMessagesPromise = sessionId
    ? supabase
        .from("chat_messages")
        .select("role, content, mode, created_at")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true })
        .limit(80)
    : Promise.resolve({ data: [], error: null });

  const [salesRes, expensesRes, sessionRes] = await Promise.all([
    salesPromise,
    expensesPromise,
    sessionMessagesPromise,
  ]);

  const errors: string[] = [];
  if (rpcRes.error)
    errors.push(`rpc:get_chat_db_context: ${rpcRes.error.message}`);
  if (salesRes.error) errors.push(`sales: ${salesRes.error.message}`);
  if (expensesRes.error) errors.push(`expenses: ${expensesRes.error.message}`);
  if (sessionRes.error)
    errors.push(`chat_messages: ${sessionRes.error.message}`);

  const sales = salesRes.error ? [] : ((salesRes.data ?? []) as SalesRow[]);
  const expenses = expensesRes.error
    ? []
    : ((expensesRes.data ?? []) as ExpenseRow[]);
  const sessionMessages = sessionRes.error
    ? []
    : ((sessionRes.data ?? []) as ChatMessageRow[]);

  return {
    context: toCompactDbContext({ sales, expenses, sessionMessages }),
    meta: {
      connected: errors.length === 0,
      keyType,
      salesCount: sales.length,
      expensesCount: expenses.length,
      sessionMessagesCount: sessionMessages.length,
      errors,
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      message?: string;
      history?: ChatMessageInput[];
      sessionId?: string;
    };

    if (!body.message || !body.message.trim()) {
      return Response.json({ error: "message is required" }, { status: 400 });
    }

    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return Response.json(
        { error: "Groq API key not configured" },
        { status: 500 },
      );
    }

    const groq = new Groq({ apiKey: groqApiKey });
    const dbResult = await fetchDbContext(body.sessionId);

    const history = Array.isArray(body.history) ? body.history.slice(-12) : [];
    const dbContextText = dbResult.context
      ? JSON.stringify(dbResult.context)
      : '{"notice":"Database context unavailable"}';

    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `You are VoiceTrace assistant. Help the user with business, sales, product, operations, and general queries. Keep answers concise, practical, and friendly.

You have access to VoiceTrace database context in JSON format. Use it whenever the user asks about sales, expenses, trends, performance, comparisons, or recommendations.
If the user asks for something not in data, say so clearly and suggest what they can record.

DATABASE_CONTEXT_JSON:
${dbContextText}`,
      },
      ...history.map((m) => ({ role: m.role, content: m.content })),
      {
        role: "user",
        content: body.message,
      },
    ];

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages,
      temperature: 0.4,
      max_completion_tokens: 700,
    });

    const reply = completion.choices[0]?.message?.content?.trim();
    if (!reply) {
      return Response.json({ error: "No response generated" }, { status: 500 });
    }

    return Response.json({ reply, dbMeta: dbResult.meta });
  } catch (error) {
    console.error("chat/respond error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
