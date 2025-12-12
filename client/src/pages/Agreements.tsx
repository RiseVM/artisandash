import { useState } from "react";
import { useSignedAgreements, useCustomers, useDeleteSignedAgreement } from "@/hooks/use-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Search, FileText, Trash2, Eye, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { SignedAgreement } from "@shared/schema";

export function Agreements() {
  const { data: agreements = [], isLoading } = useSignedAgreements();
  const { data: customers = [] } = useCustomers();
  const deleteAgreementMutation = useDeleteSignedAgreement();
  const { toast } = useToast();
  
  const [search, setSearch] = useState("");
  const [selectedAgreement, setSelectedAgreement] = useState<SignedAgreement | null>(null);

  const getCustomerName = (customerId: number) => {
    const customer = customers.find(c => c.id === customerId);
    return customer?.name || "Unknown";
  };

  const filteredAgreements = agreements.filter(agreement => {
    const customerName = getCustomerName(agreement.customer_id);
    const searchLower = search.toLowerCase();
    return (
      agreement.document_title.toLowerCase().includes(searchLower) ||
      customerName.toLowerCase().includes(searchLower)
    );
  });

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this agreement?")) return;
    try {
      await deleteAgreementMutation.mutateAsync(id);
      toast({ title: "Agreement deleted" });
    } catch (err) {
      toast({ title: "Error deleting agreement", variant: "destructive" });
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
          <h1 className="text-2xl font-serif font-bold text-primary" data-testid="text-page-title">Signed Agreements</h1>
          <p className="text-muted-foreground">View and manage customer signed agreements</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              All Agreements ({filteredAgreements.length})
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search agreements..." 
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search-agreements"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAgreements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {search ? "No agreements match your search." : "No signed agreements yet."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document Title</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Signed Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAgreements.map((agreement) => (
                  <TableRow key={agreement.id} data-testid={`row-agreement-${agreement.id}`}>
                    <TableCell className="font-medium">{agreement.document_title}</TableCell>
                    <TableCell>{getCustomerName(agreement.customer_id)}</TableCell>
                    <TableCell>
                      {agreement.signed_at 
                        ? format(new Date(agreement.signed_at), 'MMM d, yyyy h:mm a')
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedAgreement(agreement)}
                          data-testid={`button-view-agreement-${agreement.id}`}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(agreement.id)}
                          className="text-destructive hover:text-destructive"
                          data-testid={`button-delete-agreement-${agreement.id}`}
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

      <Dialog open={!!selectedAgreement} onOpenChange={() => setSelectedAgreement(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedAgreement?.document_title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Customer:</span>
                <p className="font-medium">{selectedAgreement ? getCustomerName(selectedAgreement.customer_id) : ''}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Signed:</span>
                <p className="font-medium">
                  {selectedAgreement?.signed_at 
                    ? format(new Date(selectedAgreement.signed_at), 'MMM d, yyyy h:mm a')
                    : '-'}
                </p>
              </div>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground mb-2">Signature:</p>
              <div className="border rounded-lg p-4 bg-white">
                {selectedAgreement?.signature_data ? (
                  <img 
                    src={selectedAgreement.signature_data} 
                    alt="Customer signature" 
                    className="max-w-full h-auto"
                    data-testid="img-signature"
                  />
                ) : (
                  <p className="text-muted-foreground">No signature available</p>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
