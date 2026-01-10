import { useRef, useState, useEffect } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Eraser, Check } from "lucide-react";

interface SignatureCaptureProps {
  onAccept: (signature: string) => void;
  onClear?: () => void;
  label?: string;
  required?: boolean;
  width?: number;
  height?: number;
  disabled?: boolean;
}

export function SignatureCapture({
  onAccept,
  onClear,
  label = "Signature",
  required = false,
  width,
  height = 150,
  disabled = false,
}: SignatureCaptureProps) {
  const canvasRef = useRef<SignatureCanvas>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [canvasWidth, setCanvasWidth] = useState(width || 400);

  // Resize canvas to fit container width
  useEffect(() => {
    if (!width && containerRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const newWidth = entry.contentRect.width;
          if (newWidth > 0) {
            setCanvasWidth(newWidth);
          }
        }
      });

      resizeObserver.observe(containerRef.current);
      return () => resizeObserver.disconnect();
    }
  }, [width]);

  const handleClear = () => {
    canvasRef.current?.clear();
    setIsEmpty(true);
    onClear?.();
  };

  const handleAccept = () => {
    if (canvasRef.current && !isEmpty) {
      const signature = canvasRef.current.toDataURL("image/png");
      onAccept(signature);
    }
  };

  const handleEnd = () => {
    setIsEmpty(canvasRef.current?.isEmpty() ?? true);
  };

  return (
    <div className="space-y-2">
      {label && (
        <Label>
          {label}
          {required && " *"}
        </Label>
      )}
      <div
        ref={containerRef}
        className="border rounded-md bg-white overflow-hidden"
        style={{ height }}
      >
        <SignatureCanvas
          ref={canvasRef}
          penColor="black"
          canvasProps={{
            width: canvasWidth,
            height: height,
            className: "signature-canvas",
            style: { width: "100%", height: "100%" },
          }}
          onEnd={handleEnd}
        />
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClear}
          disabled={disabled || isEmpty}
        >
          <Eraser className="h-4 w-4 mr-1" />
          Clear
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleAccept}
          disabled={disabled || isEmpty}
        >
          <Check className="h-4 w-4 mr-1" />
          Accept Signature
        </Button>
      </div>
      {isEmpty && required && (
        <p className="text-xs text-muted-foreground">
          Please sign above to continue
        </p>
      )}
    </div>
  );
}

// Simpler inline version for dialogs
export function SignatureCanvasInline({
  onSignatureChange,
  height = 150,
}: {
  onSignatureChange: (signature: string | null) => void;
  height?: number;
}) {
  const canvasRef = useRef<SignatureCanvas>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(400);

  useEffect(() => {
    if (containerRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const newWidth = entry.contentRect.width;
          if (newWidth > 0) {
            setCanvasWidth(newWidth);
          }
        }
      });

      resizeObserver.observe(containerRef.current);
      return () => resizeObserver.disconnect();
    }
  }, []);

  const handleEnd = () => {
    if (canvasRef.current && !canvasRef.current.isEmpty()) {
      const signature = canvasRef.current.toDataURL("image/png");
      onSignatureChange(signature);
    }
  };

  const handleClear = () => {
    canvasRef.current?.clear();
    onSignatureChange(null);
  };

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="border rounded-md bg-white overflow-hidden"
        style={{ height }}
      >
        <SignatureCanvas
          ref={canvasRef}
          penColor="black"
          canvasProps={{
            width: canvasWidth,
            height: height,
            className: "signature-canvas",
            style: { width: "100%", height: "100%" },
          }}
          onEnd={handleEnd}
        />
      </div>
      <Button type="button" variant="outline" size="sm" onClick={handleClear}>
        <Eraser className="h-4 w-4 mr-1" />
        Clear Signature
      </Button>
    </div>
  );
}
