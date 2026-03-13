import { useState } from "react";
import { useSignedAgreements, useDeleteSignedAgreement } from "./hooks";
import { useCustomers } from "@/features/customers/hooks";
import { useSendPortalSetupEmail } from "@/features/portal/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateEST } from "@/lib/utils";
import { Search, FileText, Trash2, Eye, Loader2, ExternalLink, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { SignedAgreement } from "@shared/schema";

export function Agreements() {
  const { data: agreements = [], isLoading } = useSignedAgreements();
  const { data: customers = [] } = useCustomers();
  const deleteAgreementMutation = useDeleteSignedAgreement();
  const sendPortalSetupMutation = useSendPortalSetupEmail();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [selectedAgreement, setSelectedAgreement] = useState<SignedAgreement | null>(null);
  const [deleteAgreement, setDeleteAgreement] = useState<SignedAgreement | null>(null);

  const getCustomerName = (customerId: number) => {
    const customer = customers.find((c) => c.id === customerId);
    return customer?.name || "Unknown";
  };

  const filteredAgreements = agreements.filter((agreement) => {
    const customerName = getCustomerName(agreement.customer_id);
    const searchLower = search.toLowerCase();
    return (
      agreement.document_title.toLowerCase().includes(searchLower) ||
      customerName.toLowerCase().includes(searchLower)
    );
  });

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!deleteAgreement) return;
    try {
      await deleteAgreementMutation.mutateAsync(deleteAgreement.id);
      toast({ title: "Agreement deleted" });
      setDeleteAgreement(null);
    } catch {
      setDeleteAgreement(null);
      toast({ title: "Error deleting agreement", variant: "destructive" });
    }
  };

  const handleSendPortalInvite = async (agreement: SignedAgreement) => {
    const customer = customers.find((c) => c.id === agreement.customer_id);
    if (!customer || !customer.email) {
      toast({ title: "Customer email not found", variant: "destructive" });
      return;
    }

    try {
      await sendPortalSetupMutation.mutateAsync({
        customer_email: customer.email,
        customer_name: customer.name || "Customer",
        context: 'agreement',
        context_details: agreement.document_title,
      });
      toast({ title: "Portal invitation sent" });
    } catch (err) {
      toast({
        title: "Error sending portal invitation",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-primary">Signed Checkouts</h1>
          <p className="text-muted-foreground">View and manage customer signed sample checkouts</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              All Checkouts ({filteredAgreements.length})
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search checkouts..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAgreements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {search ? "No checkouts match your search." : "No signed checkouts yet."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document Title</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Signed Date</TableHead>
                  <TableHead>Google Drive</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAgreements.map((agreement) => (
                  <TableRow key={agreement.id}>
                    <TableCell className="font-medium">{agreement.document_title}</TableCell>
                    <TableCell>{getCustomerName(agreement.customer_id)}</TableCell>
                    <TableCell>
                      {agreement.signed_at
                        ? formatDateEST(agreement.signed_at, { includeTime: true })
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {agreement.google_drive_link ? (
                        <a
                          href={agreement.google_drive_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View in Drive
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedAgreement(agreement)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSendPortalInvite(agreement)}
                          disabled={sendPortalSetupMutation.isPending}
                          title="Send portal invitation"
                        >
                          <UserPlus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteAgreement(agreement)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Agreement Dialog */}
      <Dialog open={!!selectedAgreement} onOpenChange={() => setSelectedAgreement(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedAgreement?.document_title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Customer:</span>
                <p className="font-medium">
                  {selectedAgreement ? getCustomerName(selectedAgreement.customer_id) : ""}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Signed:</span>
                <p className="font-medium">
                  {selectedAgreement?.signed_at
                    ? formatDateEST(selectedAgreement.signed_at, { includeTime: true })
                    : "-"}
                </p>
              </div>
            </div>

            {selectedAgreement?.google_drive_link && (
              <div>
                <span className="text-sm text-muted-foreground">Google Drive:</span>
                <p>
                  <a
                    href={selectedAgreement.google_drive_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View in Google Drive
                  </a>
                </p>
              </div>
            )}

            {selectedAgreement?.agreement_text && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Agreement Terms:</p>
                <div className="border rounded-lg p-4 bg-gray-50 max-h-64 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm font-sans">
                    {selectedAgreement.agreement_text}
                  </pre>
                </div>
              </div>
            )}

            <div>
              <p className="text-sm text-muted-foreground mb-2">Signature:</p>
              <div className="border rounded-lg p-4 bg-white">
                {selectedAgreement?.signature_data ? (
                  <img
                    src={selectedAgreement.signature_data}
                    alt="Customer signature"
                    className="max-w-full h-auto"
                  />
                ) : (
                  <p className="text-muted-foreground">No signature available</p>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteAgreement} onOpenChange={() => setDeleteAgreement(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this checkout?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
