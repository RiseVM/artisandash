import { useState } from "react";
import { Link } from "wouter";
import { useContracts, useDeleteContract, useSendForSignature, useResendContractEmail } from "./hooks";
import { useSendPortalSetupEmail } from "../portal/hooks";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { formatDateEST } from "@/lib/utils";
import { Search, ClipboardList, Trash2, Eye, Loader2, ExternalLink, FileText, Home, Plus, PenLine, Printer, Send, Mail, UserPlus, Bath, Wrench, BookOpen, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Contract } from "@shared/schema";

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
    if (type === 'custom_cabinetry') return 'Cabinet Design & Layout Agreement';
    if (type === 'kitchen_design_retainer') return 'Kitchen Design Retainer';
    if (type === 'bathroom_remodel_checklist') return 'Bathroom Remodel Checklist';
    if (type === 'bathroom_scope_of_work') return 'Bathroom Scope of Work';
    if (type === 'bathroom_remodel_instructions') return 'Bathroom Remodel Instructions';
    if (type === 'bathroom_permit_checklist') return 'Bathroom Permit Checklist';
    return 'Home Improvement Contract';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline">Draft</Badge>;
      case 'sent_for_signature':
        return <Badge variant="secondary">Sent for Signature</Badge>;
      case 'signed':
        return <Badge variant="default">Signed</Badge>;
      case 'completed':
        return <Badge className="bg-green-600">Completed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const filteredContracts = contracts.filter(contract => {
    const searchLower = search.toLowerCase();
    return (
      contract.customer_name.toLowerCase().includes(searchLower) ||
      contract.customer_email.toLowerCase().includes(searchLower) ||
      getContractTypeName(contract.contract_type).toLowerCase().includes(searchLower)
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

  const handlePrintPDF = (contractId: number) => {
    window.open(`/api/contracts/${contractId}/pdf`, '_blank');
  };

  const handleSendForSignature = async (contract: Contract) => {
    try {
      await sendForSignatureMutation.mutateAsync(contract.id);
      toast({ title: "Signing request sent to customer" });
    } catch (err) {
      toast({
        title: "Error sending signing request",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleResendEmail = async (contract: Contract) => {
    try {
      await resendEmailMutation.mutateAsync(contract.id);
      toast({ title: "Email resent to customer" });
    } catch (err) {
      toast({
        title: "Error resending email",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleSendPortalInvite = async (contract: Contract) => {
    try {
      await sendPortalSetupMutation.mutateAsync({
        customer_email: contract.customer_email,
        customer_name: contract.customer_name,
        context: 'contract',
        context_details: getContractTypeName(contract.contract_type),
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

        <Link href="/contracts/kitchen-design-retainer">
          <Card className="cursor-pointer hover:border-primary transition-colors" data-testid="card-kitchen-design-retainer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PenLine className="h-5 w-5" />
                Kitchen Design Retainer Agreement
              </CardTitle>
              <CardDescription>
                $1,200 design retainer for kitchen planning with Peter Lemos. Applies as credit toward cabinet purchase.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" data-testid="button-new-kitchen-design-retainer">
                <Plus className="h-4 w-4 mr-2" />
                Create New Agreement
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/contracts/bathroom-remodel-checklist">
          <Card className="cursor-pointer hover:border-primary transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bath className="h-5 w-5" />
                Bathroom Remodel Checklist
              </CardTitle>
              <CardDescription>
                Tailored project checklist covering permits, planning, demolition, rough-in, finishing, and final inspection.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Create New Checklist
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/contracts/bathroom-scope-of-work">
          <Card className="cursor-pointer hover:border-primary transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Bathroom Scope of Work
              </CardTitle>
              <CardDescription>
                Formal scope of work for bathroom gut renovation — demolition, plumbing, electrical, tile, and all finish work.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Create New SOW
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/contracts/bathroom-remodel-instructions">
          <Card className="cursor-pointer hover:border-primary transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Bathroom Remodel Instructions
              </CardTitle>
              <CardDescription>
                Site assessment, measurements, trade scheduling, design selections, and showroom appointments.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Create New Instructions
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/contracts/bathroom-permit-checklist">
          <Card className="cursor-pointer hover:border-primary transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Bathroom Permit Checklist
              </CardTitle>
              <CardDescription>
                Guilford, CT permit checklist — required permits, application submission, inspections, and completion.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Create New Checklist
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
                  <TableHead>Status</TableHead>
                  <TableHead>Signed Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContracts.map((contract) => (
                  <TableRow key={contract.id} data-testid={`row-contract-${contract.id}`}>
                    <TableCell className="font-medium">{getContractTypeName(contract.contract_type)}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{contract.customer_name}</p>
                        <p className="text-sm text-muted-foreground">{contract.customer_email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(contract.status || 'draft')}</TableCell>
                    <TableCell>
                      {contract.signed_at
                        ? formatDateEST(contract.signed_at, { includeTime: true })
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {/* View details */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedContract(contract)}
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        {/* Print PDF */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePrintPDF(contract.id)}
                          title="Download PDF"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>

                        {/* Send for signature (draft only) */}
                        {contract.status === 'draft' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSendForSignature(contract)}
                            title="Send for signature"
                            disabled={sendForSignatureMutation.isPending}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        )}

                        {/* Resend email (signed contracts) */}
                        {contract.status === 'signed' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResendEmail(contract)}
                            title="Resend contract email"
                            disabled={resendEmailMutation.isPending}
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                        )}

                        {/* Send portal invite */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSendPortalInvite(contract)}
                          title="Send portal invitation"
                          disabled={sendPortalSetupMutation.isPending}
                        >
                          <UserPlus className="h-4 w-4" />
                        </Button>

                        {/* Delete */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteContract(contract)}
                          title="Delete contract"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
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

      <Dialog open={!!selectedContract} onOpenChange={() => setSelectedContract(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Contract Details</DialogTitle>
          </DialogHeader>
          {selectedContract && (
            <div className="space-y-4">
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
                <p>{selectedContract.signed_at ? formatDateEST(selectedContract.signed_at, { includeTime: true }) : '-'}</p>
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
              {selectedContract.google_drive_link && (
                <div>
                  <a
                    href={selectedContract.google_drive_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-1"
                  >
                    View in Google Drive <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              )}
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
