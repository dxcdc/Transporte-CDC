"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Search,
    Eye,
    Loader2,
    Filter,
    Calendar,
    TrendingUp,
    Calendar as CalendarIcon
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateFilterModal } from "@/components/DateFilterModal";
import { PlatformFilter } from "@/components/PlatformFilter";
import { StatusFilter } from "@/components/StatusFilter";

interface Funcionario {
    id: string;
    nome: string;
    sobrenome: string;
    nomeCompleto: string;
    email: string;
    grupo: string;
    programa: string;
    servico: string;
    cidade: string;
    pais: string;
    totalViagens: number;
    valorTotal: number;
}

interface CorridaDetalhe {
    id: string;
    dataSolicitacao: string;
    horaSolicitacao: string;
    horaChegada: string;
    enderecoPartida: string;
    enderecoDestino: string;
    servico: string;
    grupo: string;
    detalhamentoDespesa: string;
    valorTotal: number;
    distanciaKm: number;
}

// Opções para os selects
interface SelectOption {
    value: string;
    label: string;
}

export default function UsuariosPage() {
    const [initialLoading, setInitialLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
    const [modalAberto, setModalAberto] = useState(false);
    const [funcionarioSelecionado, setFuncionarioSelecionado] = useState<Funcionario | null>(null);
    const [corridasDetalhe, setCorridasDetalhe] = useState<CorridaDetalhe[]>([]);
    const [loadingDetalhe, setLoadingDetalhe] = useState(false);

    // Estados para filtros
    const [programaSelecionado, setProgramaSelecionado] = useState("todos");
    const [plataformaSelecionada, setPlataformaSelecionada] = useState("todos");
    const [status, setStatus] = useState("todos");
    const [dataInicio, setDataInicio] = useState("");
    const [dataFim, setDataFim] = useState("");
    const [modalFiltroAberto, setModalFiltroAberto] = useState(false);
    const [tempDataInicio, setTempDataInicio] = useState("");
    const [tempDataFim, setTempDataFim] = useState("");
    const [evolucaoMensal, setEvolucaoMensal] = useState<any[]>([]);
    const [totalViagensFunc, setTotalViagensFunc] = useState(0);
    const [totalValorFunc, setTotalValorFunc] = useState(0);
    const [agrupamento, setAgrupamento] = useState<'dia' | 'mes'>('mes');

    // Opções para o select de programas
    const [programasOptions, setProgramasOptions] = useState<SelectOption[]>([{ value: "todos", label: "Todos os programas" }]);

    // Carregar opções de programas
    const carregarOpcoes = async () => {
        try {
            const params = new URLSearchParams();
            if (dataInicio) params.append('dataInicio', dataInicio);
            if (dataFim) params.append('dataFim', dataFim);
            if (plataformaSelecionada && plataformaSelecionada !== 'todos') params.append('plataforma', plataformaSelecionada);
            if (status && status !== 'todos') params.append('status', status);

            const programasRes = await fetch(`/api/dashboard/programas-lista?${params.toString()}`);
            const programasData = await programasRes.json();
            setProgramasOptions([
                { value: "todos", label: "Todos os programas" },
                ...programasData.map((p: string) => ({ value: p, label: p }))
            ]);
        } catch (error) {
            console.error("Erro ao carregar programas:", error);
        }
    };

    // Carregar funcionários
    const carregarFuncionarios = async () => {
        if (!initialLoading) {
            setUpdating(true);
        }
        try {
            const params = new URLSearchParams();

            // Só adiciona se tiver valor válido
            if (dataInicio && dataInicio.trim() !== '') {
                params.append('dataInicio', dataInicio);
            }
            if (dataFim && dataFim.trim() !== '') {
                params.append('dataFim', dataFim);
            }
            if (programaSelecionado && programaSelecionado !== 'todos') {
                params.append('programa', programaSelecionado);
            }
            if (plataformaSelecionada && plataformaSelecionada !== 'todos') {
                params.append('plataforma', plataformaSelecionada);
            }
            if (status && status !== 'todos') {
                params.append('status', status);
            }

            const url = `/api/dashboard/funcionarios?${params.toString()}`;
            console.log('📡 URL:', url);

            const response = await fetch(url);

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Erro da API:', errorData);
                throw new Error(errorData.error || "Erro ao carregar funcionários");
            }

            const data = await response.json();
            setFuncionarios(data);
        } catch (error) {
            console.error("Erro:", error);
            toast.error(error instanceof Error ? error.message : "Erro ao carregar funcionários");
        } finally {
            setInitialLoading(false);
            setUpdating(false);
        }
    };

    useEffect(() => {
        carregarOpcoes();
        carregarFuncionarios();
    }, [dataInicio, dataFim, programaSelecionado, plataformaSelecionada, status]);

    // Carregar detalhes das corridas do funcionário
    const carregarDetalhesCorridas = async (funcionario: Funcionario) => {
        setLoadingDetalhe(true);
        setFuncionarioSelecionado(funcionario);
        setModalAberto(true);

        try {
            const params = new URLSearchParams();
            if (funcionario.nomeCompleto) params.append('nomeCompleto', funcionario.nomeCompleto);
            if (funcionario.email) params.append('email', funcionario.email);
            if (dataInicio) params.append('dataInicio', dataInicio);
            if (dataFim) params.append('dataFim', dataFim);
            if (programaSelecionado && programaSelecionado !== 'todos') params.append('programa', programaSelecionado);
            if (plataformaSelecionada && plataformaSelecionada !== 'todos') params.append('plataforma', plataformaSelecionada);
            if (status && status !== 'todos') params.append('status', status);

            // Buscar corridas detalhadas
            const response = await fetch(`/api/dashboard/corridas-por-funcionario?${params.toString()}`);
            if (!response.ok) throw new Error("Erro ao carregar corridas");
            const data = await response.json();
            setCorridasDetalhe(data);

            // Buscar evolução mensal
            const evolucaoRes = await fetch(`/api/dashboard/evolucao-mensal-funcionario?${params.toString()}`);
            if (evolucaoRes.ok) {
                const evolucaoData = await evolucaoRes.json();
                setEvolucaoMensal(evolucaoData.evolucaoMensal || []);
                setTotalViagensFunc(evolucaoData.totalViagens || 0);
                setTotalValorFunc(evolucaoData.totalValor || 0);
                setAgrupamento(evolucaoData.agrupamento || 'mes');
            }
        } catch (error) {
            console.error("Erro ao carregar detalhes:", error);
            toast.error("Erro ao carregar dados do funcionário");
        } finally {
            setLoadingDetalhe(false);
        }
    };

    const handleVerDetalhes = (funcionario: Funcionario) => {
        carregarDetalhesCorridas(funcionario);
    };

    const handleAbrirFiltro = () => {
        setTempDataInicio(dataInicio);
        setTempDataFim(dataFim);
        setModalFiltroAberto(true);
    };

    const handleAplicarFiltro = (novaDataInicio: string, novaDataFim: string) => {
        setDataInicio(novaDataInicio);
        setDataFim(novaDataFim);
    };

    const handleResetFiltro = () => {
        setDataInicio("");
        setDataFim("");
        setProgramaSelecionado("todos");
        setPlataformaSelecionada("todos");
        toast.info("Filtros removidos. Mostrando todos os dados.");
    };

    // Filtrar funcionários pelo searchTerm (client-side)
    const funcionariosFiltrados = funcionarios.filter((func) =>
        func.nomeCompleto.toLowerCase().includes(searchTerm.toLowerCase()) ||
        func.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        func.programa.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Verificar se há filtros ativos
    const hasActiveFilters = dataInicio || dataFim || programaSelecionado !== "todos" || plataformaSelecionada !== "todos";

    if (initialLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-[#5D2A1A]" />
                <span className="ml-2 text-gray-600">Carregando funcionários...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                            Funcionários
                            {updating && <Loader2 className="h-5 w-5 animate-spin text-[#5D2A1A]" />}
                        </h1>
                        <p className="text-gray-600">Lista de funcionários e seus gastos</p>
                        {hasActiveFilters && (
                            <p className="text-sm text-blue-600 mt-1">
                                {dataInicio && `Data início: ${dataInicio}`}
                                {dataFim && ` até ${dataFim}`}
                                {programaSelecionado !== "todos" && ` • Programa: ${programaSelecionado}`}
                                {plataformaSelecionada !== "todos" && ` • Plataforma: ${plataformaSelecionada}`}
                            </p>
                        )}
                    </div>

                    {/* Botões de filtro */}
                    <div className="flex flex-wrap gap-2 items-center">
                        <PlatformFilter value={plataformaSelecionada} onChange={setPlataformaSelecionada} />
                        <StatusFilter value={status} onChange={setStatus} />

                        <select
                            className="border rounded-lg px-3 py-2 text-sm bg-[#F5F3EF] hover:bg-[#E8E4DF] transition-colors cursor-pointer min-w-[180px]"
                            value={programaSelecionado}
                            onChange={(e) => setProgramaSelecionado(e.target.value)}
                        >
                            {programasOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>

                        {hasActiveFilters && (
                            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                Filtro ativo
                            </span>
                        )}

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleAbrirFiltro}
                            className="flex items-center gap-2"
                        >
                            <Filter className="h-4 w-4" />
                            Filtrar por Data
                        </Button>

                        {hasActiveFilters && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleResetFiltro}
                                className="text-red-600 hover:text-red-700"
                            >
                                Limpar Filtros
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Barra de pesquisa */}
            <CardContent className="p-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Buscar por nome, email ou programa..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </CardContent>

            {/* Modal de Filtro de Data */}
            <DateFilterModal
                open={modalFiltroAberto}
                onOpenChange={setModalFiltroAberto}
                onApply={handleAplicarFiltro}
                dataInicioInicial={tempDataInicio}
                dataFimInicial={tempDataFim}
            />

            {/* Tabela de funcionários */}
            <Card>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Nome</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Programa</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Viagens</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Valor Total</th>
                                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {funcionariosFiltrados.map((func) => (
                                    <tr key={func.id} className="border-b hover:bg-gray-50">
                                        <td className="py-3 px-4">
                                            <div>
                                                <p className="font-medium">{func.nomeCompleto}</p>
                                                <p className="text-xs text-gray-500">{func.email}</p>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-sm">{func.programa}</td>
                                        <td className="py-3 px-4 text-right font-medium">{func.totalViagens}</td>
                                        <td className="py-3 px-4 text-right font-medium">
                                            R$ {func.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleVerDetalhes(func)}
                                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                title="Ver detalhes"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                                {funcionariosFiltrados.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="text-center py-8 text-gray-500">
                                            Nenhum funcionário encontrado
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Modal de detalhes das corridas */}
            <Dialog open={modalAberto} onOpenChange={setModalAberto}>
                <DialogContent className="max-w-[90vw] max-h-[90vh] overflow-y-auto bg-gray-50">
                    <DialogHeader>
                        <DialogTitle className="text-xl">
                            Corridas de {funcionarioSelecionado?.nomeCompleto}
                        </DialogTitle>
                        <DialogDescription>
                            Histórico completo de viagens do funcionário
                        </DialogDescription>
                    </DialogHeader>

                    {/* Tabs dentro do modal */}
                    <Tabs defaultValue="corridas" className="w-full">
                        <TabsList className="grid w-full max-w-md grid-cols-3">
                            <TabsTrigger value="corridas">Detalhes das Corridas</TabsTrigger>
                            <TabsTrigger value="servicos">Serviços Utilizados</TabsTrigger>
                            <TabsTrigger value="evolucao">Evolução Mensal</TabsTrigger>
                        </TabsList>

                        {/* Aba 1 - Detalhes das Corridas */}
                        <TabsContent value="corridas" className="mt-4">
                            {loadingDetalhe ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="h-8 w-8 animate-spin text-[#5D2A1A]" />
                                    <span className="ml-2 text-gray-600">Carregando corridas...</span>
                                </div>
                            ) : corridasDetalhe.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    Nenhuma corrida encontrada para este funcionário
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[100px]">Data</TableHead>
                                                <TableHead className="w-[80px]">Hora</TableHead>
                                                <TableHead className="w-[120px]">Grupo</TableHead>
                                                <TableHead className="min-w-[200px]">Endereço de Partida</TableHead>
                                                <TableHead className="min-w-[200px]">Endereço de Destino</TableHead>
                                                <TableHead className="w-[100px]">KM</TableHead>
                                                <TableHead className="w-[100px]">Serviço</TableHead>
                                                <TableHead className="min-w-[150px]">Detalhamento</TableHead>
                                                <TableHead className="w-[100px] text-right">Valor</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {corridasDetalhe.map((corrida) => (
                                                <TableRow key={corrida.id}>
                                                    <TableCell className="font-mono text-sm align-top">
                                                        {corrida.dataSolicitacao
                                                            ? format(new Date(corrida.dataSolicitacao), "dd/MM/yyyy", { locale: ptBR })
                                                            : "-"}
                                                    </TableCell>
                                                    <TableCell className="font-mono text-sm align-top">
                                                        {corrida.horaSolicitacao && corrida.horaChegada
                                                            ? `${corrida.horaSolicitacao} → ${corrida.horaChegada}`
                                                            : corrida.horaSolicitacao || corrida.horaChegada || "-"}
                                                    </TableCell>
                                                    <TableCell className="align-top font-medium">
                                                        {corrida.grupo || "-"}
                                                    </TableCell>
                                                    <TableCell className="min-w-[200px] align-top whitespace-normal break-words">
                                                        {corrida.enderecoPartida || "-"}
                                                    </TableCell>
                                                    <TableCell className="min-w-[200px] align-top whitespace-normal break-words">
                                                        {corrida.enderecoDestino || "-"}
                                                    </TableCell>
                                                    <TableCell className="font-mono text-sm align-top">
                                                        {corrida.distanciaKm
                                                            ? `${corrida.distanciaKm.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km`
                                                            : "-"}
                                                    </TableCell>
                                                    <TableCell className="align-top">
                                                        {corrida.servico || "-"}
                                                    </TableCell>
                                                    <TableCell className="min-w-[150px] align-top whitespace-normal break-words">
                                                        {corrida.detalhamentoDespesa || "-"}
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium align-top">
                                                        R$ {corrida.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </TabsContent>

                        {/* Aba 2 - Serviços Utilizados */}
                        <TabsContent value="servicos" className="mt-4">
                            {loadingDetalhe ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="h-8 w-8 animate-spin text-[#5D2A1A]" />
                                    <span className="ml-2 text-gray-600">Carregando serviços...</span>
                                </div>
                            ) : corridasDetalhe.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    Nenhum serviço encontrado para este funcionário
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {(() => {
                                            const servicosMap = new Map();
                                            const totalGeral = corridasDetalhe.reduce((acc, c) => acc + c.valorTotal, 0);
                                            const colors = [
                                                "from-[#5D2A1A] to-[#7A3B24]",
                                                "from-[#8B4513] to-[#A0522D]",
                                                "from-[#CD853F] to-[#DEB887]",
                                                "from-[#D2691E] to-[#E5984C]",
                                                "from-[#F4A460] to-[#FFB347]",
                                                "from-[#8B5A2B] to-[#A0522D]",
                                                "from-[#6B3410] to-[#8B4513]",
                                                "from-[#9B5C3D] to-[#B87C4F]",
                                            ];

                                            corridasDetalhe.forEach(corrida => {
                                                const servico = corrida.servico && corrida.servico.trim() !== '' ? corrida.servico : 'Não categorizado';
                                                if (!servicosMap.has(servico)) {
                                                    servicosMap.set(servico, { quantidade: 0, valor: 0 });
                                                }
                                                const item = servicosMap.get(servico);
                                                item.quantidade++;
                                                item.valor += corrida.valorTotal;
                                            });

                                            const servicosOrdenados = Array.from(servicosMap.entries())
                                                .map(([nome, dados]) => ({ nome, ...dados }))
                                                .sort((a, b) => b.quantidade - a.quantidade);

                                            return servicosOrdenados.map((servico, index) => (
                                                <Card key={servico.nome} className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
                                                    <div className={`bg-gradient-to-r ${colors[index % colors.length]} p-3 text-white`}>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-lg font-bold truncate flex-1 mr-2">{servico.nome}</span>
                                                            <span className="text-2xl font-bold">{servico.quantidade}</span>
                                                        </div>
                                                    </div>
                                                    <CardContent className="p-4">
                                                        <div className="space-y-2">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-sm text-gray-600">Valor Total:</span>
                                                                <span className="font-semibold text-gray-900">
                                                                    R$ {servico.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-sm text-gray-600">Ticket Médio:</span>
                                                                <span className="font-semibold text-gray-900">
                                                                    R$ {(servico.valor / servico.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-sm text-gray-600">Percentual:</span>
                                                                <span className="font-semibold text-gray-900">
                                                                    {totalGeral > 0 ? ((servico.valor / totalGeral) * 100).toFixed(1) : 0}%
                                                                </span>
                                                            </div>
                                                            <div className="mt-2">
                                                                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                                    <div
                                                                        className="h-full rounded-full"
                                                                        style={{
                                                                            width: `${totalGeral > 0 ? (servico.valor / totalGeral) * 100 : 0}%`,
                                                                            backgroundColor: colors[index % colors.length].split(' ')[0].replace('from-[', '').replace(']', '')
                                                                        }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ));
                                        })()}
                                    </div>
                                </div>
                            )}
                        </TabsContent>

                        {/* Aba 3 - Evolução Mensal */}
                        <TabsContent value="evolucao" className="mt-4">
                            {loadingDetalhe ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="h-8 w-8 animate-spin text-[#5D2A1A]" />
                                    <span className="ml-2 text-gray-600">Carregando evolução...</span>
                                </div>
                            ) : evolucaoMensal.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    Nenhum dado de evolução encontrado para este funcionário
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Cards de resumo */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Card>
                                            <CardContent className="p-4">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-600">Total de Viagens</p>
                                                        <p className="text-2xl font-bold text-gray-900">{totalViagensFunc}</p>
                                                    </div>
                                                    <div className="p-2 bg-blue-100 rounded-full">
                                                        <CalendarIcon className="h-5 w-5 text-blue-600" />
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                        <Card>
                                            <CardContent className="p-4">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-600">Valor Total Gasto</p>
                                                        <p className="text-2xl font-bold text-green-600">
                                                            R$ {totalValorFunc.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                        </p>
                                                    </div>
                                                    <div className="p-2 bg-green-100 rounded-full">
                                                        <TrendingUp className="h-5 w-5 text-green-600" />
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    {/* Gráfico de evolução de gastos */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <TrendingUp className="h-5 w-5" />
                                                {agrupamento === 'dia' ? 'Evolução Diária de Gastos' : 'Evolução Mensal de Gastos'}
                                            </CardTitle>
                                            <p className="text-sm text-gray-600">
                                                {funcionarioSelecionado?.nomeCompleto}
                                                {agrupamento === 'dia' && ' - Detalhamento por dia do mês'}
                                            </p>
                                        </CardHeader>
                                        <CardContent>
                                            <ResponsiveContainer width="100%" height={320}>
                                                <LineChart data={evolucaoMensal}>
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis
                                                        dataKey={agrupamento === 'dia' ? 'dia' : 'mes'}
                                                        angle={agrupamento === 'dia' ? -45 : 0}
                                                        textAnchor={agrupamento === 'dia' ? 'end' : 'middle'}
                                                        height={agrupamento === 'dia' ? 60 : 30}
                                                    />
                                                    <YAxis
                                                        yAxisId="left"
                                                        tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                                                    />
                                                    <YAxis
                                                        yAxisId="right"
                                                        orientation="right"
                                                        tickFormatter={(value) => value}
                                                    />
                                                    <Tooltip
                                                        formatter={(value, name) => {
                                                            if (name === 'valor') return `R$ ${Number(value).toLocaleString('pt-BR')}`;
                                                            return value;
                                                        }}
                                                    />
                                                    <Legend />
                                                    <Line
                                                        yAxisId="left"
                                                        type="monotone"
                                                        dataKey="valor"
                                                        stroke="#5D2A1A"
                                                        strokeWidth={2}
                                                        dot={{ r: 4 }}
                                                        name="Valor (R$)"
                                                    />
                                                    <Line
                                                        yAxisId="right"
                                                        type="monotone"
                                                        dataKey="viagens"
                                                        stroke="#2563EB"
                                                        strokeWidth={2}
                                                        dot={{ r: 4 }}
                                                        name="Viagens"
                                                    />
                                                </LineChart>
                                            </ResponsiveContainer>
                                            {evolucaoMensal.length === 0 && (
                                                <p className="text-center text-gray-500 py-8">Nenhum dado encontrado</p>
                                            )}
                                        </CardContent>
                                    </Card>

                                    {/* Gráfico de barras */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <CalendarIcon className="h-5 w-5" />
                                                {agrupamento === 'dia' ? 'Viagens por Dia' : 'Viagens por Mês'}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <ResponsiveContainer width="100%" height={300}>
                                                <BarChart data={evolucaoMensal}>
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis
                                                        dataKey={agrupamento === 'dia' ? 'dia' : 'mes'}
                                                        angle={agrupamento === 'dia' ? -45 : 0}
                                                        textAnchor={agrupamento === 'dia' ? 'end' : 'middle'}
                                                        height={agrupamento === 'dia' ? 60 : 30}
                                                    />
                                                    <YAxis />
                                                    <Tooltip />
                                                    <Legend />
                                                    <Bar dataKey="viagens" fill="#5D2A1A" name="Viagens" />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </CardContent>
                                    </Card>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </DialogContent>
            </Dialog>
        </div>
    );
}