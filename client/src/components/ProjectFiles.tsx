import { useState, useRef } from "react";
import {
  useProjectFiles,
  useUploadProjectFile,
  useDeleteProjectFile,
} from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Paperclip,
  Trash2,
  FileText,
  Image,
  FileSpreadsheet,
  File,
  Download,
  Eye,
  Camera,
  Upload,
} from "lucide-react";
import type { ProjectFile, ProjectPhase } from "@shared/schema";

const fileCategories: Record<string, string> = {
  document: "Document",
  contract: "Contract",
  design: "Design",
  photo: "Photo",
  receipt: "Receipt",
  other: "Other",
};

const photoTypes: Record<string, string> = {
  before: "Before",
  during: "During",
  after: "After",
  issue: "Issue",
  material: "Material",
};

interface ProjectFilesProps {
  projectId: number;
  phases: ProjectPhase[];
  canManage: boolean;
}

export function ProjectFiles({ projectId, phases, canManage }: ProjectFilesProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: files = [], isLoading } = useProjectFiles(projectId);
  const uploadMutation = useUploadProjectFile();
  const deleteMutation = useDeleteProjectFile();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deleteFile, setDeleteFile] = useState<ProjectFile | null>(null);
  const [previewFile, setPreviewFile] = useState<ProjectFile | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    category: "document",
    description: "",
    entity_type: "project",
    entity_id: "",
    is_photo: "no" as "yes" | "no",
    photo_type: "",
    client_visible: "yes",
  });

  const resetForm = () => {
    setFormData({
      name: "",
      category: "document",
      description: "",
      entity_type: "project",
      entity_id: "",
      is_photo: "no",
      photo_type: "",
      client_visible: "yes",
    });
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!formData.name) {
        setFormData({ ...formData, name: file.name });
      }
      // Auto-detect if it's a photo
      if (file.type.startsWith("image/")) {
        setFormData((prev) => ({ ...prev, is_photo: "yes", category: "photo" }));
      }
    }
  };

  const handleCreate = async () => {
    if (!selectedFile) {
      toast({ title: "Please select a file to upload", variant: "destructive" });
      return;
    }

    try {
      await uploadMutation.mutateAsync({
        projectId,
        file: selectedFile,
        metadata: {
          name: formData.name || selectedFile.name,
          category: formData.category || undefined,
          description: formData.description || undefined,
          entity_type: formData.entity_type,
          entity_id: formData.entity_id ? parseInt(formData.entity_id) : undefined,
          is_photo: formData.is_photo,
          photo_type: formData.is_photo === "yes" ? formData.photo_type || undefined : undefined,
          client_visible: formData.client_visible,
        },
      });
      resetForm();
      setIsAddOpen(false);
      toast({ title: "File Uploaded" });
    } catch (err: any) {
      toast({ title: "Upload Failed", description: err?.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteFile) return;
    try {
      await deleteMutation.mutateAsync({ id: deleteFile.id, projectId });
      setDeleteFile(null);
      toast({ title: "File Deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  const getFileIcon = (file: ProjectFile) => {
    if (file.is_photo || file.mime_type?.startsWith("image/")) {
      return <Image className="h-5 w-5 text-green-600" />;
    }
    if (file.mime_type?.includes("pdf")) {
      return <FileText className="h-5 w-5 text-red-600" />;
    }
    if (file.mime_type?.includes("spreadsheet") || file.mime_type?.includes("excel")) {
      return <FileSpreadsheet className="h-5 w-5 text-green-700" />;
    }
    return <File className="h-5 w-5 text-blue-600" />;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImage = (file: ProjectFile) => {
    return file.is_photo || file.mime_type?.startsWith("image/");
  };

  // Group files by category
  const photoFiles = files.filter((f) => f.is_photo);
  const documentFiles = files.filter((f) => !f.is_photo);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Paperclip className="h-5 w-5" />
            Files & Photos
          </CardTitle>
          {canManage && (
            <Button size="sm" onClick={() => setIsAddOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add File
            </Button>
          )}
        </div>
        <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
          <span>{files.length} file{files.length !== 1 ? "s" : ""}</span>
          {photoFiles.length > 0 && <span>{photoFiles.length} photo{photoFiles.length !== 1 ? "s" : ""}</span>}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">Loading...</div>
        ) : files.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Paperclip className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No files attached yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Photos Section */}
            {photoFiles.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Photos ({photoFiles.length})
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {photoFiles.map((file) => (
                    <div
                      key={file.id}
                      className="relative group aspect-square border rounded-lg overflow-hidden bg-muted"
                    >
                      {file.thumbnail_url || file.file_url ? (
                        <img
                          src={file.thumbnail_url || file.file_url}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Image className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      {file.photo_type && (
                        <Badge
                          className="absolute top-1 left-1 text-xs"
                          variant="secondary"
                        >
                          {photoTypes[file.photo_type] || file.photo_type}
                        </Badge>
                      )}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                          size="icon"
                          variant="secondary"
                          className="h-8 w-8"
                          onClick={() => setPreviewFile(file)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canManage && (
                          <Button
                            size="icon"
                            variant="destructive"
                            className="h-8 w-8"
                            onClick={() => setDeleteFile(file)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Documents Section */}
            {documentFiles.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Documents ({documentFiles.length})
                </h4>
                <div className="space-y-2">
                  {documentFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-3 p-3 border rounded-lg bg-background"
                    >
                      {getFileIcon(file)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium truncate">{file.name}</span>
                          {file.category && (
                            <Badge variant="secondary">
                              {fileCategories[file.category] || file.category}
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          {file.file_size && <span>{formatFileSize(file.file_size)}</span>}
                          {file.description && (
                            <span className="truncate">{file.description}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {file.file_url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => window.open(file.file_url, "_blank")}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        {isImage(file) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setPreviewFile(file)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        {canManage && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteFile(file)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Add File Dialog */}
      <Dialog
        open={isAddOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddOpen(false);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add File</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select File</Label>
              <div className="flex gap-2">
                <Input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="flex-1"
                />
              </div>
              {selectedFile && (
                <p className="text-sm text-muted-foreground">
                  Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="File name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(fileCategories).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Client Visible</Label>
                <Select
                  value={formData.client_visible}
                  onValueChange={(value) => setFormData({ ...formData, client_visible: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_photo"
                  checked={formData.is_photo === "yes"}
                  onChange={(e) => setFormData({ ...formData, is_photo: e.target.checked ? "yes" : "no" })}
                  className="h-4 w-4"
                />
                <Label htmlFor="is_photo" className="cursor-pointer">This is a photo</Label>
              </div>
            </div>
            {formData.is_photo === "yes" && (
              <div className="space-y-2">
                <Label>Photo Type</Label>
                <Select
                  value={formData.photo_type}
                  onValueChange={(value) => setFormData({ ...formData, photo_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(photoTypes).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Link to Phase</Label>
              <Select
                value={formData.entity_id}
                onValueChange={(value) => setFormData({ ...formData, entity_type: value ? "phase" : "project", entity_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None (project level)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None (project level)</SelectItem>
                  {phases.map((phase) => (
                    <SelectItem key={phase.id} value={phase.id.toString()}>
                      {phase.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={uploadMutation.isPending}
            >
              {uploadMutation.isPending ? "Uploading..." : "Add File"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{previewFile?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center min-h-[300px]">
            {previewFile?.file_url && (
              <img
                src={previewFile.file_url}
                alt={previewFile.name}
                className="max-w-full max-h-[60vh] object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteFile} onOpenChange={(open) => !open && setDeleteFile(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteFile?.name}".
            </AlertDialogDescription>
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
    </Card>
  );
}
