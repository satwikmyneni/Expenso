"use client";

import { useEffect, useState } from "react";
import { useFinance } from "./finance-provider";
import type { TransactionPage, TransactionQuery } from "@/features/transactions/query";
import type { PeriodReport } from "@/features/insights/reports";

export function useTransactions(query: TransactionQuery, enabled = true) {
  const { queryTransactions, data } = useFinance();
  const queryJson = JSON.stringify(query);
  const key = `${data.demo}:${data.profile.id}:${queryJson}`;
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState<{ key: string; result?: TransactionPage; error?: string }>({ key: "" });
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const timer = setTimeout(() => { void queryTransactions(JSON.parse(queryJson)).then((result) => {
      if (active) setState({ key, result });
    }).catch((error) => { if (active) setState({ key, error: error instanceof Error ? error.message : "Unable to load transactions." }); }); }, 150);
    return () => { active = false; clearTimeout(timer); };
  }, [key, queryJson, queryTransactions, retry, enabled]);
  return { result: state.key === key ? state.result : undefined, error: state.key === key ? state.error : undefined, refresh: () => { setState({ key: "" }); setRetry((value) => value+1); } };
}

export function usePeriodReport(start: string, end: string, account?: string) {
  const { periodReport, data } = useFinance();
  const key = `${data.demo}:${data.profile.id}:${start}:${end}:${account ?? ""}`;
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState<{ key: string; result?: PeriodReport; error?: string }>({ key: "" });
  useEffect(() => {
    let active = true;
    void periodReport(start,end,account).then((result) => { if (active) setState({ key,result }); })
      .catch((error) => { if (active) setState({ key,error: error instanceof Error ? error.message : "Unable to load report." }); });
    return () => { active = false; };
  }, [start,end,account,key,periodReport,retry]);
  return { result: state.key === key ? state.result : undefined, error: state.key === key ? state.error : undefined, refresh: () => setRetry((value) => value+1) };
}
