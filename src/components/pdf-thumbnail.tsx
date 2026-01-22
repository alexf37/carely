"use client";

import { cn } from "@/lib/utils";
import { FileTextIcon } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import type { PDFPageProxy } from "pdfjs-dist";

async function getPdfjs() {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url
    ).toString();
    return pdfjsLib;
}

export type PdfThumbnailProps = {
    url: string;
    className?: string;
};

export function PdfThumbnail({ url, className }: PdfThumbnailProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pageRef = useRef<PDFPageProxy | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);

    const renderPage = useCallback(async function renderPage(page: PDFPageProxy, width: number, height: number) {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext("2d");
        if (!context) return;

        const viewport = page.getViewport({ scale: 1 });
        const dpr = window.devicePixelRatio || 1;
        const scale = Math.min(width / viewport.width, height / viewport.height) * dpr;
        const scaledViewport = page.getViewport({ scale });

        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;

        await page.render({
            canvasContext: context,
            viewport: scaledViewport,
            canvas: canvas,
        }).promise;

        setIsLoading(false);
    }, []);

    useEffect(() => {
        let cancelled = false;

        async function loadPdf() {
            if (!url) return;

            try {
                setIsLoading(true);
                setError(false);

                const pdfjsLib = await getPdfjs();
                if (cancelled) return;

                const pdf = await pdfjsLib.getDocument(url).promise;
                if (cancelled) return;

                const page = await pdf.getPage(1);
                if (cancelled) return;

                pageRef.current = page;

                const container = containerRef.current;
                if (container) {
                    const { width, height } = container.getBoundingClientRect();
                    if (width > 0 && height > 0) {
                        await renderPage(page, width, height);
                    }
                }
            } catch (err) {
                if (!cancelled) {
                    console.error("Failed to load PDF:", err);
                    setError(true);
                    setIsLoading(false);
                }
            }
        }

        loadPdf();

        return () => {
            cancelled = true;
            pageRef.current = null;
        };
    }, [url, renderPage]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const resizeObserver = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry || !pageRef.current) return;

            const { width, height } = entry.contentRect;
            if (width > 0 && height > 0) {
                renderPage(pageRef.current, width, height);
            }
        });

        resizeObserver.observe(container);

        return () => {
            resizeObserver.disconnect();
        };
    }, [renderPage]);

    if (error) {
        return <FileTextIcon className={cn("text-red-500", className)} />;
    }

    return (
        <div ref={containerRef} className={cn("relative", className)}>
            <canvas
                ref={canvasRef}
                className={cn(
                    "absolute inset-0 w-full h-full object-cover",
                    isLoading && "opacity-0"
                )}
            />
        </div>
    );
}
