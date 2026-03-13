import { useState } from "react";
import { Link } from "wouter";
import { useContracts, useDeleteContract, useSendForSignature, useResendContractEmail, useSendPortalSetupEmail } from "@/hooks/use-api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Search, ClipboardList, Trash2, Eye, Loader2, ExternalLink, FileText, Home, Plus, Send, Printer, Mail, MailPlus, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Contract } from "@shared/schema";

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-gray-100 text-gray-800" },
  sent_for_signature: { label: "Sent for Signature", className: "bg-yellow-100 text-yellow-800" },
  signed: { label: "Signed", className: "bg-green-100 text-green-800" },
  completed: { label: "Completed", className: "bg-blue-100 text-blue-800" },
};

export function Contracts() {
  const { data: contracts = [], isLoading } = useContracts();
  const deleteContractMutation = useDeleteContract();
  const sendForSignatureMutation = useSendForSignature();
  const resendEmailMutation = useResendContractEmail();
  const sendPortalSetupMutation = useSendPortalSetupEmail();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [deleteContract, setDeleteContract] = useState<Contract | null>(null);

  const getContractTypeName = (type: string) => {
    return type === 'custom_cabinetry'
      ? 'Cabinet Design & Layout Agreement'
      : 'Home Improvement Contract';
  };

  const filteredContracts = contracts.filter(contract => {
    const searchLower = search.toLowerCase();
    return (
      contract.customer_name.toLowerCase().includes(searchLower) ||
      contract.customer_email.toLowerCase().includes(searchLower) ||
      getContractTypeName(contract.contract_type).toLowerCase().includes(searchLower) ||
      (contract.status || '').toLowerCase().includes(searchLower)
    );
  });

  const handleDelete = async () => {
    if (!deleteContract) return;
    try {
      await deleteContractMutation.mutateAsync(deleteContract.id);
      toast({ title: "Contract deleted" });
      setDeleteContract(null);
    } catch (err) {
      toast({ title: "Error deleting contract", variant: "destructive" });
    }
  };

  const handleSendForSignature = async (contract: Contract) => {
    try {
      await sendForSignatureMutation.mutateAsync(contract.id);
      toast({ title: "Contract sent for signature!", description: `Email sent to ${contract.customer_email}` });
    } catch (err) {
      toast({ title: "Error sending contract", variant: "destructive" });
    }
  };

  const handleResendEmail = async (contract: Contract) => {
    try {
      await resendEmailMutation.mutateAsync(contract.id);
      toast({ title: "Email resent!", description: `Signed contract sent to ${contract.customer_email}` });
    } catch (err) {
      toast({ title: "Error resending email", variant: "destructive" });
    }
  };

  const handlePrint = (contract: Contract) => {
    window.open(`/api/contracts/${contract.id}/pdf`, '_blank');
  };

  const handleSendPortalSetup = async (contract: Contract) => {
    try {
      await sendPortalSetupMutation.mutateAsync({
        customer_email: contract.customer_email,
        customer_name: contract.customer_name,
        context: 'contract',
        context_details: getContractTypeName(contract.contract_type),
      });
      toast({ title: "Portal setup email sent!", description: `Invitation sent to ${contract.customer_email}` });
    } catch (err) {
      toast({ title: "Error sending portal setup email", variant: "destructive" });
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
          <h1 className="text-2xl font-serif font-bold text-primary" data-testid="text-page-title">Contracts</h1>
          <p className="text-muted-foreground">Create and manage customer contracts</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/contracts/cabinetry">
          <Card className="cursor-pointer hover:border-primary transition-colors" data-testid="card-cabinetry-contract">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Cabinet Design & Layout Agreement
              </CardTitle>
              <CardDescription>
                For custom cabinetry orders including pricing, deposits, and delivery terms.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" data-testid="button-new-cabinetry">
                <Plus className="h-4 w-4 mr-2" />
                Create New Contract
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/contracts/home-improvement">
          <Card className="cursor-pointer hover:border-primary transition-colors" data-testid="card-home-improvement-contract">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                Home Improvement Contract
              </CardTitle>
              <CardDescription>
                For home improvement projects including labor, materials, and project timeline.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" data-testid="button-new-home-improvement">
                <Plus className="h-4 w-4 mr-2" />
                Create New Contract
              </Button>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              All Contracts ({filteredContracts.length})
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contracts..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search-contracts"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredContracts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {search ? "No contracts match your search." : "No contracts created yet. Create one above!"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contract Type</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Google Drive</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContracts.map((contract) => {
                  const status = statusConfig[contract.status || 'draft'] || statusConfig.draft;
                  return (
                    <TableRow key={contract.id} data-testid={`row-contract-${contract.id}`}>
                      <TableCell className="font-medium">{getContractTypeName(contract.contract_type)}</TableCell>
                      <TableCell>{contract.customer_name}</TableCell>
                      <TableCell>{contract.customer_email}</TableCell>
                      <TableCell>
                        <Badge className={status.className}>{status.label}</Badge>
                      </TableCell>
                      <TableCell>
                        {contract.signed_at
                          ? formatDateEST(contract.signed_at, { includeTime: true })
                          : contract.created_at
                            ? formatDateEST(contract.created_at)
                            : '-'}
                      </TableCell>
                      <TableCell>
                        {contract.google_drive_link ? (
                          <a
                            href={contract.google_drive_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-1"
                            data-testid={`link-drive-${contract.id}`}
                          >
                            View <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {/* View details */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedContract(contract)}
                            title="View details"
                            data-testid={`button-view-${contract.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          {/* Print/Download PDF */}
                          {contract.signature_data && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePrint(contract)}
                              title="Print / Download PDF"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                          )}

                          {/* Send for remote signature (draft contracts only) */}
                          {(contract.status === 'draft' || !contract.status) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSendForSignature(contract)}
                              disabled={sendForSignatureMutation.isPending}
                              title="Email for signature"
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          )}

                          {/* Resend signed contract email */}
                          {(contract.status === 'signed' || contract.status === 'completed') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResendEmail(contract)}
                              disabled={resendEmailMutation.isPending}
                              title="Resend signed contract email"
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                          )}

                          {/* Send portal setup email */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSendPortalSetup(contract)}
                            disabled={sendPortalSetupMutation.isPending}
                            title="Send portal setup invitation"
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>

                          {/* Continue editing (drafts) */}
                          {(contract.status === 'draft' || contract.status === 'sent_for_signature') && (
                            <Link href={`/contracts/${contract.contract_type === 'custom_cabinetry' ? 'cabinetry' : 'home-improvement'}?draft=${contract.id}`}>
                              <Button variant="ghost" size="sm" title="Continue editing">
                                <FileText className="h-4 w-4 text-blue-600" />
                              </Button>
                            </Link>
                          )}

                          {/* Delete */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteContract(contract)}
                            data-testid={`button-delete-${contract.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedContract} onOpenChange={() => setSelectedContract(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Contract Details</DialogTitle>
          </DialogHeader>
          {selectedContract && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold">Status</h4>
                <Badge className={(statusConfig[selectedContract.status || 'draft'] || statusConfig.draft).className}>
                  {(statusConfig[selectedContract.status || 'draft'] || statusConfig.draft).label}
                </Badge>
              </div>
              <div>
                <h4 className="font-semibold">Contract Type</h4>
                <p>{getContractTypeName(selectedContract.contract_type)}</p>
              </div>
              <div>
                <h4 className="font-semibold">Customer</h4>
                <p>{selectedContract.customer_name}</p>
                <p className="text-sm text-muted-foreground">{selectedContract.customer_email}</p>
                {selectedContract.customer_phone && (
                  <p className="text-sm text-muted-foreground">{selectedContract.customer_phone}</p>
                )}
              </div>
              {selectedContract.customer_address && (
                <div>
                  <h4 className="font-semibold">Customer Address</h4>
                  <p>{selectedContract.customer_address}</p>
                </div>
              )}
              {selectedContract.property_address && (
                <div>
                  <h4 className="font-semibold">Property Address</h4>
                  <p>{selectedContract.property_address}</p>
                </div>
              )}
              <div>
                <h4 className="font-semibold">Signed Date</h4>
                <p>{selectedContract.signed_at ? formatDateEST(selectedContract.signed_at, { includeTime: true }) : 'Not yet signed'}</p>
              </div>
              {selectedContract.signature_data && (
                <div>
                  <h4 className="font-semibold">Signature</h4>
                  <div className="border rounded-md p-2 bg-white">
                    <img
                      src={selectedContract.signature_data}
                      alt="Customer Signature"
                      className="max-h-24"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t">
                {selectedContract.signature_data && (
                  <Button size="sm" variant="outline" onClick={() => handlePrint(selectedContract)}>
                    <Printer className="h-4 w-4 mr-2" />
                    Print / Download PDF
                  </Button>
                )}
                {selectedContract.google_drive_link && (
                  <a
                    href={selectedContract.google_drive_link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button size="sm" variant="outline">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View in Google Drive
                    </Button>
                  </a>
                )}
                {(selectedContract.status === 'draft' || !selectedContract.status) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      handleSendForSignature(selectedContract);
                      setSelectedContract(null);
                    }}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Email for Signature
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteContract} onOpenChange={() => setDeleteContract(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contract?</AlertDialogTitle>
          </AlertDialogHeader>
          <p>This will permanently delete this contract record. The file in Google Drive will not be removed.</p>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
