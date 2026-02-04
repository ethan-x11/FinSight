"use client";

import * as React from "react";

import { cn } from "./utils";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./hover-card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";

export type QueryPlanItem = {
  query: string;
  reasoning?: string;
};

type QueryPlanButtonProps = {
  queries: QueryPlanItem[];
  className?: string;
};

export function QueryPlanButton({ queries, className }: QueryPlanButtonProps) {
  if (!queries || queries.length === 0) return null;

  return (
    <Dialog>
      <HoverCard>
        <HoverCardTrigger asChild>
          <DialogTrigger asChild>
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-800",
                className,
              )}
            >
              Query plan
            </button>
          </DialogTrigger>
        </HoverCardTrigger>
        <HoverCardContent className="bg-gray-100 w-80">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Query plan
          </div>
          <div className="mt-3 space-y-2">
            {queries.map((item, idx) => (
              <div key={`${item.query}-${idx}`} className="rounded-md border border-slate-200 bg-white p-2">
                <div className="text-[10px] font-semibold text-slate-400">Query {idx + 1}</div>
                <div className="text-xs text-slate-700 line-clamp-2">{item.query}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-[11px] text-slate-500">Click to view full rationale.</div>
        </HoverCardContent>
      </HoverCard>

      <DialogContent className="bg-white w-2xl">
        <DialogHeader>
          <DialogTitle>Query plan details</DialogTitle>
          <DialogDescription>Generated queries and their rationale.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {queries.map((item, idx) => (
            <Card key={`${item.query}-${idx}`} className="border-blue-200">
              {/* <CardHeader className="pb-3"> */}
                {/* <CardTitle className="text-sm">Query {idx + 1}</CardTitle> */}
                {/* <CardDescription className="text-xs">Search instruction</CardDescription> */}
              {/* </CardHeader> */}
              <CardHeader className="space-y-2 text-sm p-2">
                <CardTitle className="text-slate-900">{item.query}</CardTitle>
                {item.reasoning && (
                  <CardDescription className="rounded-md border border-slate-100 bg-slate-50 px-2 py-1 text-xs text-slate-600 whitespace-pre-wrap">
                    {item.reasoning}
                  </CardDescription>
                )}
              </CardHeader>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
