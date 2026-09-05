import Link from "next/link";
import { BarChart3, LockKeyhole } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { Card, CardContent } from "@/components/ui/card";

export default function AssistantPage() {
  return <><PageHeading eyebrow="Privacy first" title="AI is turned off" description="Expenso's core finance experience works without an AI provider." />
    <Card className="mx-auto max-w-2xl"><CardContent className="grid place-items-center px-6 py-16 text-center">
      <span className="grid size-16 place-items-center rounded-3xl bg-accent text-brand"><LockKeyhole className="size-7" /></span>
      <h2 className="mt-6 text-xl font-bold">No financial data is sent to an AI service</h2>
      <p className="mt-3 max-w-lg text-sm leading-6 text-muted">Balances, budgets, cash flow, net worth, duplicate checks, and reports remain available through deterministic calculations.</p>
      <Link href="/insights" className="mt-7 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand/90"><BarChart3 className="size-4" />View deterministic insights</Link>
    </CardContent></Card>
  </>;
}
