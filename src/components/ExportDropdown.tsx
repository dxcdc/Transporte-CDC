"use client";

import { useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Download, ChevronDown, Filter, FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { exportarCorridasParaExcel } from "@/lib/export/export-excel";

interface ExportDropdownProps {
    filters?: {
        dataInicio?: string;
        dataFim?: string;
        plataforma?: string;
        status?: string;
        programa?: string;
        grupo?: string;
        funcionario?: string;
    };
    buttonText?: string;
    className?: string;
}

export function ExportDropdown({ filters = {}, buttonText = "Exportar", className }: ExportDropdownProps) {
    const [loading, setLoading] = useState(false);

    const handleExport = async (tudo: boolean) => {
        setLoading(true);
        const toastId = toast.loading(tudo ? "Exportando todas as corridas..." : "Exportando corridas filtradas...");

        try {
            const params = new URLSearchParams();
            if (tudo) {
                params.append("tudo", "true");
            } else {
                if (filters.dataInicio) params.append("dataInicio", filters.dataInicio);
                if (filters.dataFim) params.append("dataFim", filters.dataFim);
                if (filters.plataforma && filters.plataforma !== "todos") params.append("plataforma", filters.plataforma);
                if (filters.status && filters.status !== "todos") params.append("status", filters.status);
                if (filters.programa && filters.programa !== "todos") params.append("programa", filters.programa);
                if (filters.grupo && filters.grupo !== "todos") params.append("grupo", filters.grupo);
                if (filters.funcionario && filters.funcionario !== "todos") params.append("funcionario", filters.funcionario);
            }

            const response = await fetch(`/api/exportar-corridas?${params.toString()}`);
            if (!response.ok) {
                throw new Error("Erro ao buscar dados para exportação");
            }

            const data = await response.json();
            const corridas = data.corridas || [];

            if (corridas.length === 0) {
                toast.dismiss(toastId);
                toast.warning("Nenhum dado encontrado para exportar");
                return;
            }

            const dataHoje = new Date().toISOString().split("T")[0];
            const nomeArquivo = tudo
                ? `todas_as_corridas_${dataHoje}`
                : `corridas_filtradas_${dataHoje}`;

            exportarCorridasParaExcel(corridas, nomeArquivo);

            toast.dismiss(toastId);
            toast.success(`${corridas.length} corridas exportadas com sucesso!`);
        } catch (error: any) {
            console.error("Erro na exportação:", error);
            toast.dismiss(toastId);
            toast.error(error.message || "Erro ao exportar arquivo");
        } finally {
            setLoading(false);
        }
    };

    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
                <Button
                    disabled={loading}
                    className={className || "bg-[#5D2A1A] hover:bg-[#4A2214] text-white flex items-center gap-2"}
                >
                    {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Download className="h-4 w-4" />
                    )}
                    <span>{buttonText}</span>
                    <ChevronDown className="h-4 w-4 opacity-80 ml-1" />
                </Button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
                <DropdownMenu.Content
                    align="end"
                    sideOffset={5}
                    className="z-50 min-w-[220px] overflow-hidden rounded-md border bg-white p-1 shadow-md animate-in fade-in-80"
                >
                    <DropdownMenu.Item
                        onClick={() => handleExport(false)}
                        className="relative flex cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm text-gray-700 outline-none transition-colors hover:bg-[#5D2A1A] hover:text-white focus:bg-[#5D2A1A] focus:text-white gap-2"
                    >
                        <Filter className="h-4 w-4" />
                        <span>Exportar Dados Filtrados</span>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                        onClick={() => handleExport(true)}
                        className="relative flex cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm text-gray-700 outline-none transition-colors hover:bg-[#5D2A1A] hover:text-white focus:bg-[#5D2A1A] focus:text-white gap-2"
                    >
                        <FileSpreadsheet className="h-4 w-4" />
                        <span>Exportar Tudo</span>
                    </DropdownMenu.Item>
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>
    );
}
