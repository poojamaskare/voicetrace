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
  // Use IST (UTC+5:30) for today's date to match the user's timezone
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
  const istNow = new Date(now.getTime() + istOffset);
  const today = istNow.toISOString().slice(0, 10);

  // Group sales by date with full item details
  const salesByDate: Record<string, { total: number; items: Array<{ name: string; qty: number; price: number; total: number; type: string }> }> = {};
  for (const sale of input.sales) {
    // Normalize date: Supabase DATE returns YYYY-MM-DD but handle edge cases
    const date = String(sale.date).slice(0, 10);
    if (!salesByDate[date]) {
      salesByDate[date] = { total: 0, items: [] };
    }
    salesByDate[date].total += Number(sale.total) || 0;
    for (const item of sale.items ?? []) {
      salesByDate[date].items.push({
        name: (item.name || "Unknown").trim(),
        qty: Number(item.qty) || 0,
        price: Number(item.price) || 0,
        total: Number(item.total) || 0,
        type: item.type || "sale",
      });
    }
  }

  // Compute overall totals
  const totalSalesRevenue = input.sales.reduce((sum, row) => {
    const saleItemsTotal = (row.items ?? []).filter(i => (i.type || "sale") === "sale").reduce((s, i) => s + (Number(i.total) || 0), 0);
    return sum + saleItemsTotal;
  }, 0);

  const totalExpensesFromSales = input.sales.reduce((sum, row) => {
    const expItemsTotal = (row.items ?? []).filter(i => i.type === "expense").reduce((s, i) => s + (Number(i.total) || 0), 0);
    return sum + expItemsTotal;
  }, 0);

  const totalExpensesFromTable = input.expenses.reduce(
    (sum, row) => sum + (Number(row.amount) || 0),
    0,
  );

  const totalExpenses = totalExpensesFromSales + totalExpensesFromTable;

  // Today-specific data
  const todayData = salesByDate[today];
  const todaySaleItems = todayData?.items.filter(i => i.type === "sale") ?? [];
  const todaySalesTotal = todaySaleItems.reduce((s, i) => s + i.total, 0);
  const todayExpenseItems = todayData?.items.filter(i => i.type === "expense") ?? [];
  const todayExpenseTotal = todayExpenseItems.reduce((s, i) => s + i.total, 0);
  const todayTableExpenses = input.expenses.filter(e => String(e.date).slice(0, 10) === today);
  const todayTableExpenseTotal = todayTableExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);

  // Top selling items across all dates
  const itemRevenue: Record<string, { revenue: number; qty: number }> = {};
  for (const sale of input.sales) {
    for (const item of sale.items ?? []) {
      if (item.type === "expense") continue;
      const name = (item.name || "Unknown").trim();
      if (!itemRevenue[name]) itemRevenue[name] = { revenue: 0, qty: 0 };
      itemRevenue[name].revenue += Number(item.total) || 0;
      itemRevenue[name].qty += Number(item.qty) || 0;
    }
  }
  const topItems = Object.entries(itemRevenue)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 8)
    .map(([name, data]) => ({ name, revenue: data.revenue, qty: data.qty }));

  // Build daily breakdown (most recent 10 days)
  const dailyBreakdown = Object.entries(salesByDate)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 10)
    .map(([date, data]) => ({
      date,
      sale_items: data.items.filter(i => i.type === "sale").map(i => ({ name: i.name, qty: i.qty, price: i.price, total: i.total })),
      expense_items: data.items.filter(i => i.type === "expense").map(i => ({ name: i.name, qty: i.qty, price: i.price, total: i.total })),
      sales_total: data.items.filter(i => i.type === "sale").reduce((s, i) => s + i.total, 0),
      expenses_total: data.items.filter(i => i.type === "expense").reduce((s, i) => s + i.total, 0),
    }));

  return {
    today_date: today,
    period_days: 30,
    overall_totals: {
      sales_revenue: totalSalesRevenue,
      expenses: totalExpenses,
      net: totalSalesRevenue - totalExpenses,
    },
    today_summary: {
      sales_total: todaySalesTotal,
      expenses_total: todayExpenseTotal + todayTableExpenseTotal,
      sale_items: todaySaleItems.map(i => ({ name: i.name, qty: i.qty, price: i.price, total: i.total })),
      expense_items: [
        ...todayExpenseItems.map(i => ({ name: i.name, qty: i.qty, price: i.price, total: i.total })),
        ...todayTableExpenses.map(e => ({ name: e.description || e.category, qty: 1, price: e.amount, total: e.amount })),
      ],
    },
    daily_breakdown: dailyBreakdown,
    top_sale_items: topItems,
    recent_expenses_table: input.expenses.slice(0, 10).map((e) => ({
      date: e.date,
      amount: e.amount,
      category: e.category,
      description: e.description,
    })),
  };
}

// Helper to get IST date string
function getISTDateString(): string {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  return new Date(now.getTime() + istOffset).toISOString().slice(0, 10);
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

  // Always use direct queries to get fresh data with full item details
  // (RPC function was returning stale/incomplete format)

  const todayStr = getISTDateString();
  const fromDate = new Date(new Date(todayStr).getTime() - 30 * 86400000).toISOString().slice(0, 10);

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

  const context = toCompactDbContext({ sales, expenses, sessionMessages });

  // Debug logging to trace data issues
  console.log(`[chat/respond] IST today=${todayStr}, sales=${sales.length}, expenses=${expenses.length}`);
  console.log(`[chat/respond] Sales dates: ${[...new Set(sales.map(s => s.date))].join(', ')}`);
  console.log(`[chat/respond] Today summary: sales_total=${context.today_summary.sales_total}, expense_total=${context.today_summary.expenses_total}, items=${context.today_summary.sale_items.length}`);

  return {
    context,
    meta: {
      connected: !salesRes.error && !expensesRes.error,
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

    const todayDate = getISTDateString();
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `You are VoiceTrace assistant, a business intelligence helper for Indian street food vendors. Today's date is ${todayDate}. Keep answers concise, practical, and friendly.

You have access to REAL sales and expense data from the VoiceTrace database below. ALWAYS base your answers on this actual data. When the user asks about "today", use the today_summary section. When they ask about specific dates, use daily_breakdown.

IMPORTANT RULES:
- Use EXACT numbers from the data. Do NOT guess or make up figures.
- "today_date" in the data tells you what today is.
- "today_summary" has today's sales and expenses with full item details.
- "daily_breakdown" has item-level details for recent days.
- "top_sale_items" shows best sellers by revenue and quantity.
- If asked about something not in the data, say so clearly.
- Use ₹ (Rupee symbol) for currency.

DATABASE_CONTEXT:
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
