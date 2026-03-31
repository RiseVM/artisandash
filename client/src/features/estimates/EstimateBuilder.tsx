import { useRoute, useLocation } from "wouter";
import { useEstimate } from "./hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Loader2,
  Printer,
  Pencil,
  User,
  Calendar,
  DollarSign,
  ShieldAlert,
} from "lucide-react";
import type { EstimateLineItem } from "@shared/schema";
import { NotesPanel } from "@/components/shared/NotesPanel";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  sent: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  expired: "bg-yellow-100 text-yellow-800",
  converted: "bg-purple-100 text-purple-800",
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  approved: "Approved",
  rejected: "Rejected",
  expired: "Expired",
  converted: "Converted",
};

const fmt = (v: string | number) =>
  "$" + parseFloat(String(v)).toLocaleString("en-US", { minimumFractionDigits: 2 });

export function EstimateBuilder() {
  const [, params] = useRoute("/estimates/:id");
  const [, setLocation] = useLocation();
  const estimateId = params?.id ? parseInt(params.id) : 0;

  const { data: estimate, isLoading } = useEstimate(estimateId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!estimate) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Quote not found.</p>
        <Button variant="link" onClick={() => setLocation("/estimates")}>
          Back to Quotes
        </Button>
      </div>
    );
  }

  // Group line items by section
  const sections = new Map<string, EstimateLineItem[]>();
  for (const item of estimate.lineItems) {
    const key = item.section || "General";
    if (!sections.has(key)) sections.set(key, []);
    sections.get(key)!.push(item);
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-4 flex-1">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/estimates")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm text-muted-foreground">{estimate.estimate_number}</span>
              <Badge className={statusColors[estimate.status]}>{statusLabels[estimate.status]}</Badge>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold truncate">{estimate.title}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {estimate.customer?.name || "No Customer"}
              </span>
              {estimate.issue_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Issued: {estimate.issue_date}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" />
            Print
          </Button>
          <Button size="sm" onClick={() => setLocation(`/quote-builder/${estimateId}`)}>
            <Pencil className="h-4 w-4 mr-1" />
            Edit Quote
          </Button>
        </div>
      </div>

      {/* ── Description ── */}
      {estimate.description && (
        <Card>
          <CardContent className="pt-4 text-sm text-muted-foreground">
            {estimate.description}
          </CardContent>
        </Card>
      )}

      {/* ── Line Items ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          {estimate.lineItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No line items yet. Edit this quote to add items.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Table Header */}
              <div className="hidden sm:grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground uppercase px-2">
                <div className="col-span-5">Description</div>
                <div className="col-span-2 text-right">Qty</div>
                <div className="col-span-2 text-right">Unit Price</div>
                <div className="col-span-3 text-right">Total</div>
              </div>

              {/* Grouped by section */}
              {Array.from(sections.entries()).map(([section, items]) => (
                <div key={section}>
                  {sections.size > 1 && (
                    <div className="text-sm font-semibold text-muted-foreground border-b pb-1 mb-2 px-2">
                      {section}
                    </div>
                  )}
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-12 gap-2 items-center py-2 px-2 hover:bg-muted/50 rounded"
                    >
                      <div className="col-span-12 sm:col-span-5">
                        <div className="font-medium text-sm">{item.description}</div>
                        {item.category && (
                          <span className="text-xs text-muted-foreground capitalize">{item.category}</span>
                        )}
                      </div>
                      <div className="col-span-4 sm:col-span-2 text-right text-sm">
                        {item.quantity} {item.unit || ""}
                      </div>
                      <div className="col-span-4 sm:col-span-2 text-right text-sm">
                        ${parseFloat(item.unit_price).toFixed(2)}
                      </div>
                      <div className="col-span-4 sm:col-span-3 text-right text-sm font-medium">
                        ${parseFloat(item.total).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              ))}

              {/* Totals */}
              <div className="border-t pt-3 space-y-1 px-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{fmt(estimate.subtotal)}</span>
                </div>
                {parseFloat(estimate.tax_rate) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Tax ({(parseFloat(estimate.tax_rate) * 100).toFixed(1)}%)
                    </span>
                    <span>{fmt(estimate.tax_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-1 border-t">
                  <span>Total</span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    {parseFloat(estimate.total).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Notes ── */}
      {estimate.notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{estimate.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* ── Internal Notes ── */}
      {estimate.internal_notes && (
        <Card className="border-orange-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-orange-500" />
              Internal Notes
              <Badge className="text-xs bg-orange-100 text-orange-700">Internal Only</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{estimate.internal_notes}</p>
          </CardContent>
        </Card>
      )}

      {/* ── Entity Notes Panel ── */}
      <NotesPanel entityType="estimate" entityId={estimateId} defaultInternal />
    </div>
  );
}
