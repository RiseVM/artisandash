import { useQuery } from "@tanstack/react-query";
import { PortalLayout } from "./PortalLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Loader2,
  Download,
  ClipboardCheck,
} from "lucide-react";
import type { Contract } from "@shared/schema";

export function PortalContracts() {
  const { data: contracts = [], isLoading } = useQuery<Contract[]>({
    queryKey: ["/api/portal/contracts"],
    queryFn: async () => {
      const res = await fetch("/api/portal/contracts", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch contracts");
      return res.json();
    },
  });

  const getContractTypeName = (type: string) => {
    if (type === "custom_cabinetry") return "Cabinet Design & Layout Agreement";
    if (type === "kitchen_design_retainer") return "Kitchen Design Retainer";
    return "Home Improvement Contract";
  };

  const handleDownloadPDF = (contractId: number) => {
    window.open(`/api/portal/contracts/${contractId}/pdf`, "_blank");
  };

  return (
    <PortalLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-serif">Contracts</h1>
          <p className="text-gray-500 mt-1 text-sm">View and download your signed contracts.</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : contracts.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">No Contracts Yet</h3>
              <p className="text-gray-500 text-sm">
                You don't have any signed contracts yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {contracts.map((contract) => (
              <Card key={contract.id} className="border-0 shadow-sm bg-white">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[hsl(215,30%,35%)]/10 flex items-center justify-center shrink-0">
                      <ClipboardCheck className="h-5 w-5 text-[hsl(215,30%,35%)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm">
                        {getContractTypeName(contract.contract_type)}
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Signed {new Date(contract.signed_at || contract.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleDownloadPDF(contract.id)}
                    variant="outline"
                    size="sm"
                    className="w-full mt-4 text-xs h-9"
                  >
                    <Download className="h-3.5 w-3.5 mr-2" />
                    Download PDF
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
