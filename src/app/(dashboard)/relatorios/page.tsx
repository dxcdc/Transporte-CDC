"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
    Download,
    TrendingUp,
    BarChart3,
    MapPin,
    Car,
    Users,
    Loader2,
    Calendar,
    DollarSign,
    Filter,
    Route,
    Clock,
    Sunrise,
    Sunset
} from "lucide-react";
import { toast } from "sonner";
import {
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    AreaChart,
    Area,
} from "recharts";
import { PlatformFilter } from "@/components/PlatformFilter";
import { DateFilterModal } from "@/components/DateFilterModal";
import { StatusFilter } from "@/components/StatusFilter";
import { ExportDropdown } from "@/components/ExportDropdown";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

// Cores para os gráficos
const COLORS = [
    "#5D2A1A",
    "#8B4513",
    "#A0522D",
    "#CD853F",
    "#DEB887",
    "#D2691E",
    "#F4A460",
    "#FFA07A",
];

interface ProgramasData {
    nome: string;
    valor: number;
    viagens: number;
}

interface CidadesData {
    nome: string;
    viagens: number;
    valor: number;
}

interface RankingFuncionario {
    nomeCompleto: string;
    totalViagens: number;
    valorTotal: number;
}

interface EvolucaoMensal {
    mes: string;
    valor: number;
    viagens: number;
}

interface DespesaDetalhe {
    tipo: string;
    valor: number;
    quantidade: number;
    porcentagem: number;
}

interface TrajetoRecorrente {
    endereco: string;
    totalViagens: number;
    valorTotal: number;
    valorMedio: number;
    funcionarios: number;
}

interface TrajetoCompleto {
    partida: string;
    destino: string;
    total: number;
}

interface HorarioExtraData {
    totalViagens: number;
    viagensAntes8: number;
    viagensDepois17: number;
    viagensForaHorario: number;
    percentualForaHorario: string;
    valorAntes8: number;
    valorDepois17: number;
    valorForaHorario: number;
    rankingFuncionarios: {
        nome: string;
        antes8: number;
        depois17: number;
        total: number;
        valorTotal: number;
    }[];
    distribuicaoPorHora: {
        hora: string;
        quantidade: number;
        valor: number;
    }[];
    ultimasViagens: any[];
}

export default function RelatoriosPage() {
    const [initialLoading, setInitialLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [programas, setProgramas] = useState<ProgramasData[]>([]);
    const [cidades, setCidades] = useState<CidadesData[]>([]);
    const [ranking, setRanking] = useState<RankingFuncionario[]>([]);
    const [evolucaoMensal, setEvolucaoMensal] = useState<EvolucaoMensal[]>([]);
    const [despesasDetalhe, setDespesasDetalhe] = useState<DespesaDetalhe[]>([]);

    // Novos estados para trajetos
    const [partidasFrequentes, setPartidasFrequentes] = useState<TrajetoRecorrente[]>([]);
    const [destinosFrequentes, setDestinosFrequentes] = useState<TrajetoRecorrente[]>([]);
    const [trajetosMaisComuns, setTrajetosMaisComuns] = useState<TrajetoCompleto[]>([]);

    // Filtros
    const [plataforma, setPlataforma] = useState("todos");
    const [dataInicio, setDataInicio] = useState("");
    const [dataFim, setDataFim] = useState("");
    const [modalFiltroAberto, setModalFiltroAberto] = useState(false);
    const [tempDataInicio, setTempDataInicio] = useState("");
    const [tempDataFim, setTempDataFim] = useState("");
    const [status, setStatus] = useState("todos");
    const [programaFilter, setProgramaFilter] = useState("todos");
    const [horariosData, setHorariosData] = useState<HorarioExtraData | null>(null);

    // Filtros específicos da aba Horários (Funcionário)
    const [funcionarioFilter, setFuncionarioFilter] = useState("todos");
    const [funcionariosList, setFuncionariosList] = useState<string[]>([]);
    const [programasListHorarios, setProgramasListHorarios] = useState<string[]>([]);
    const [loadingFiltros, setLoadingFiltros] = useState(false);

    // Construir URL com parâmetros
    const buildUrl = (baseUrl: string) => {
        const params = new URLSearchParams();
        if (plataforma && plataforma !== 'todos') {
            params.append('plataforma', plataforma);
        }
        if (status && status !== 'todos') {
            params.append('status', status);
        }
        if (dataInicio) {
            params.append('dataInicio', dataInicio);
        }
        if (dataFim) {
            params.append('dataFim', dataFim);
        }
        if (funcionarioFilter && funcionarioFilter !== 'todos') {
            params.append('funcionario', funcionarioFilter);
        }
        if (programaFilter && programaFilter !== 'todos') {
            params.append('programa', programaFilter);
        }
        const queryString = params.toString();
        return queryString ? `${baseUrl}?${queryString}` : baseUrl;
    };

    // Abrir modal de filtro
    const handleAbrirFiltro = () => {
        setTempDataInicio(dataInicio);
        setTempDataFim(dataFim);
        setModalFiltroAberto(true);
    };

    // Aplicar filtro
    const handleAplicarFiltro = (novaDataInicio: string, novaDataFim: string) => {
        setDataInicio(novaDataInicio);
        setDataFim(novaDataFim);
    };

    // Resetar filtro
    const handleResetFiltro = () => {
        setDataInicio("");
        setDataFim("");
        setPlataforma("todos");
        setStatus("todos");
        setProgramaFilter("todos");
        setFuncionarioFilter("todos");
        toast.info("Filtros removidos. Mostrando todos os dados.");
    };

    // Carregar lista de funcionários e programas para os filtros
    const carregarFiltrosHorarios = async () => {
        setLoadingFiltros(true);
        try {
            const params = new URLSearchParams();
            if (dataInicio) params.append('dataInicio', dataInicio);
            if (dataFim) params.append('dataFim', dataFim);
            if (plataforma && plataforma !== 'todos') params.append('plataforma', plataforma);
            if (status && status !== 'todos') params.append('status', status);
            if (programaFilter && programaFilter !== 'todos') params.append('programa', programaFilter);

            // Carregar funcionários
            const funcionariosRes = await fetch(`/api/dashboard/funcionarios-lista?${params.toString()}`);
            if (funcionariosRes.ok) {
                const data = await funcionariosRes.json();
                setFuncionariosList(data);
            }

            // Carregar programas
            const programasRes = await fetch(`/api/dashboard/programas-lista?${params.toString()}`);
            if (programasRes.ok) {
                const data = await programasRes.json();
                setProgramasListHorarios(data);
            }
        } catch (error) {
            console.error("Erro ao carregar filtros:", error);
        } finally {
            setLoadingFiltros(false);
        }
    };

    // Carregar dados
    const carregarDados = async () => {
        if (!initialLoading) {
            setUpdating(true);
        }
        try {
            // Programas
            const programasRes = await fetch(buildUrl("/api/dashboard/programas"));
            const programasData = await programasRes.json();
            setProgramas(programasData);

            // Cidades
            const cidadesRes = await fetch(buildUrl("/api/dashboard/cidades"));
            const cidadesData = await cidadesRes.json();
            setCidades(cidadesData);

            // Ranking de funcionários
            const rankingRes = await fetch(buildUrl("/api/dashboard/funcionarios"));
            const rankingData = await rankingRes.json();
            const top10 = rankingData.slice(0, 10);
            setRanking(top10);

            // Evolução Mensal
            const evolucaoRes = await fetch(buildUrl("/api/dashboard/evolucao-mensal"));
            const evolucaoData = await evolucaoRes.json();
            setEvolucaoMensal(evolucaoData);

            // Detalhamento de Despesas
            const despesasRes = await fetch(buildUrl("/api/dashboard/detalhamento-despesas"));
            const despesasData = await despesasRes.json();
            setDespesasDetalhe(despesasData);

            // Trajetos Recorrentes
            const trajetosRes = await fetch(buildUrl("/api/dashboard/trajetos-recorrentes"));
            const trajetosData = await trajetosRes.json();
            setPartidasFrequentes(trajetosData.partidasFrequentes || []);
            setDestinosFrequentes(trajetosData.destinosFrequentes || []);
            setTrajetosMaisComuns(trajetosData.trajetosMaisComuns || []);

            // Horários Extras
            const horariosRes = await fetch(buildUrl("/api/dashboard/horarios-extras"));
            const horariosData = await horariosRes.json();
            setHorariosData(horariosData);

        } catch (error) {
            console.error("Erro ao carregar dados:", error);
            toast.error("Erro ao carregar dados dos relatórios");
        } finally {
            setInitialLoading(false);
            setUpdating(false);
        }
    };

    // Carregar dados quando os filtros mudarem
    useEffect(() => {
        carregarDados();
        carregarFiltrosHorarios();
    }, [plataforma, dataInicio, dataFim, status, programaFilter]);

    // Recarregar dados quando os filtros específicos da aba Horários mudarem
    useEffect(() => {
        if (!initialLoading) {
            carregarDados();
        }
    }, [funcionarioFilter]);

    const exportarCSV = (dados: any[], nomeArquivo: string, headers: string[]) => {
        const csvRows = [headers.join(",")];
        for (const row of dados) {
            const values = headers.map(header => {
                const value = row[header.toLowerCase()] || row[header] || "";
                return `"${String(value).replace(/"/g, '""')}"`;
            });
            csvRows.push(values.join(","));
        }
        const blob = new Blob(["\uFEFF" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.setAttribute("download", `${nomeArquivo}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success(`${nomeArquivo} exportado com sucesso!`);
    };

    if (initialLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-[#5D2A1A]" />
                <span className="ml-2 text-gray-600">Carregando relatórios...</span>
            </div>
        );
    }

    // Ordenar programas por valor
    const programasOrdenados = [...programas].sort((a, b) => b.valor - a.valor).slice(0, 10);

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                        Relatórios
                        {updating && <Loader2 className="h-5 w-5 animate-spin text-[#5D2A1A]" />}
                    </h1>
                    <p className="text-gray-600">Análise de dados de mobilidade</p>
                    {(dataInicio || dataFim || funcionarioFilter !== 'todos' || programaFilter !== 'todos') && (
                        <p className="text-sm text-blue-600 mt-1">
                            {dataInicio && `Data início: ${dataInicio}`}
                            {dataFim && ` até ${dataFim}`}
                            {funcionarioFilter !== 'todos' && ` • Funcionário: ${funcionarioFilter}`}
                            {programaFilter !== 'todos' && ` • Programa: ${programaFilter}`}
                        </p>
                    )}
                </div>

                <div className="flex flex-wrap gap-4 items-center">
                    <PlatformFilter value={plataforma} onChange={setPlataforma} />
                    <StatusFilter value={status} onChange={setStatus} />

                    <Select
                        value={programaFilter}
                        onValueChange={(value) => setProgramaFilter(value)}
                        disabled={loadingFiltros}
                    >
                        <SelectTrigger className="w-[180px] bg-[#F5F3EF] hover:bg-[#bdb8ae]">
                            <SelectValue placeholder="Todos os programas" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="todos">Todos os programas</SelectItem>
                            {programasListHorarios.map((p) => (
                                <SelectItem key={p} value={p}>
                                    {p}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAbrirFiltro}
                        className="flex items-center gap-2 hover:bg-[#bdb8ae] hover:text-gray-900 focus:bg-[#bdb8ae] focus:text-gray-900 data-[highlighted]:bg-[#bdb8ae] data-[highlighted]:text-gray-900"
                    >
                        <Filter className="h-4 w-4" />
                        Filtrar por Data
                    </Button>

                    {(dataInicio || dataFim || funcionarioFilter !== 'todos' || programaFilter !== 'todos') && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleResetFiltro}
                            className="text-red-600 hover:text-red-700"
                        >
                            Limpar Filtros
                        </Button>
                    )}

                    <ExportDropdown
                        filters={{
                            dataInicio,
                            dataFim,
                            plataforma,
                            status,
                            programa: programaFilter,
                            funcionario: funcionarioFilter,
                        }}
                    />
                </div>
            </div>

            {/* Modal de Filtro */}
            <DateFilterModal
                open={modalFiltroAberto}
                onOpenChange={setModalFiltroAberto}
                onApply={handleAplicarFiltro}
                dataInicioInicial={tempDataInicio}
                dataFimInicial={tempDataFim}
            />

            {/* Tabs de relatórios */}
            <Tabs defaultValue="programas" className="space-y-4">
                <TabsList className="grid w-full max-w-5xl grid-cols-7">
                    <TabsTrigger value="programas">Programas</TabsTrigger>
                    <TabsTrigger value="cidades">Cidades</TabsTrigger>
                    <TabsTrigger value="ranking">Ranking</TabsTrigger>
                    <TabsTrigger value="evolucao">Evolução</TabsTrigger>
                    <TabsTrigger value="detalhamento">Detalhamento</TabsTrigger>
                    <TabsTrigger value="trajetos">Trajetos</TabsTrigger>
                    <TabsTrigger value="horarios">Horários</TabsTrigger>
                </TabsList>

                {/* Aba - Programas */}
                <TabsContent value="programas">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BarChart3 className="h-5 w-5" />
                                Ranking de Programas (Top 10)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={400}>
                                <BarChart
                                    data={programasOrdenados}
                                    layout="vertical"
                                    margin={{ left: 100, right: 30, top: 20, bottom: 20 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                        type="number"
                                        tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                                        label={{ value: 'Valor (R$ milhares)', position: 'bottom', offset: 0 }}
                                    />
                                    <YAxis
                                        type="category"
                                        dataKey="nome"
                                        width={120}
                                        tick={{ fontSize: 11 }}
                                    />
                                    <Tooltip
                                        formatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR')}`}
                                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px' }}
                                    />
                                    <Bar dataKey="valor" fill="#5D2A1A" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                            {programas.length === 0 && (
                                <p className="text-center text-gray-500 py-8">Nenhum programa encontrado</p>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Aba - Cidades */}
                <TabsContent value="cidades">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <MapPin className="h-5 w-5" />
                                    Gastos por Cidade
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={320}>
                                    <BarChart data={cidades}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="nome" />
                                        <YAxis tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
                                        <Tooltip formatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR')}`} />
                                        <Bar dataKey="valor" fill="#5D2A1A" />
                                    </BarChart>
                                </ResponsiveContainer>
                                {cidades.length === 0 && (
                                    <p className="text-center text-gray-500 py-8">Nenhuma cidade encontrada</p>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Top Cidades por Viagens</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {cidades.slice(0, 5).map((cidade) => (
                                        <div key={cidade.nome} className="flex justify-between items-center border-b pb-2">
                                            <div>
                                                <p className="font-medium">{cidade.nome}</p>
                                                <p className="text-sm text-gray-500">{cidade.viagens} viagens</p>
                                            </div>
                                            <p className="font-bold">R$ {cidade.valor.toLocaleString('pt-BR')}</p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Aba - Ranking de Funcionários */}
                <TabsContent value="ranking">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                Top 10 Funcionários
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">#</th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Funcionário</th>
                                            <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Viagens</th>
                                            <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Valor Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ranking.map((func, index) => (
                                            <tr key={func.nomeCompleto} className="border-b hover:bg-gray-50">
                                                <td className="py-3 px-4 font-bold text-lg">{index + 1}º</td>
                                                <td className="py-3 px-4 font-medium">{func.nomeCompleto}</td>
                                                <td className="py-3 px-4 text-right">{func.totalViagens}</td>
                                                <td className="py-3 px-4 text-right font-medium">
                                                    R$ {func.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Aba - Evolução Mensal */}
                <TabsContent value="evolucao">
                    <div className="grid grid-cols-1 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <TrendingUp className="h-5 w-5" />
                                    Evolução Mensal de Gastos
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={320}>
                                    <LineChart data={evolucaoMensal}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="mes" />
                                        <YAxis tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
                                        <Tooltip formatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR')}`} />
                                        <Legend />
                                        <Line type="monotone" dataKey="valor" stroke="#5D2A1A" strokeWidth={2} dot={{ r: 4 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                                {evolucaoMensal.length === 0 && (
                                    <p className="text-center text-gray-500 py-8">Nenhum dado encontrado</p>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <Calendar className="h-5 w-5" />
                                    Evolução Mensal de Viagens
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={320}>
                                    <AreaChart data={evolucaoMensal}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="mes" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Area type="monotone" dataKey="viagens" fill="#8B4513" fillOpacity={0.3} stroke="#5D2A1A" />
                                    </AreaChart>
                                </ResponsiveContainer>
                                {evolucaoMensal.length === 0 && (
                                    <p className="text-center text-gray-500 py-8">Nenhum dado encontrado</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="detalhamento">
                    {/* Seção de Detalhamento de Despesas */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <DollarSign className="h-5 w-5" />
                                Detalhamento de Despesas
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div>
                                    <h3 className="text-lg font-semibold mb-4">Distribuição por Tipo de Despesa</h3>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <PieChart>
                                            <Pie
                                                data={despesasDetalhe}
                                                dataKey="valor"
                                                nameKey="tipo"
                                                cx="50%"
                                                cy="50%"
                                                outerRadius={100}
                                                label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                                                labelLine={true}
                                            >
                                                {despesasDetalhe.map((_, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR')}`} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    {despesasDetalhe.length === 0 && (
                                        <p className="text-center text-gray-500 py-8">Nenhuma despesa encontrada</p>
                                    )}
                                </div>

                                <div>
                                    <h3 className="text-lg font-semibold mb-4">Despesas por Categoria</h3>
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b">
                                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Categoria</th>
                                                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Quantidade</th>
                                                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Valor Total</th>
                                                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">%</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {despesasDetalhe.map((despesa) => (
                                                    <tr key={despesa.tipo} className="border-b hover:bg-gray-50">
                                                        <td className="py-3 px-4 font-medium">{despesa.tipo}</td>
                                                        <td className="py-3 px-4 text-right">{despesa.quantidade}</td>
                                                        <td className="py-3 px-4 text-right">
                                                            R$ {despesa.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="py-3 px-4 text-right">{despesa.porcentagem.toFixed(1)}%</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Aba - Trajetos Recorrentes */}
                <TabsContent value="trajetos">
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Route className="h-5 w-5" />
                                    Trajetos Mais Comuns
                                </CardTitle>
                                <p className="text-sm text-gray-600">
                                    Top 10 trajetos mais realizados
                                </p>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {trajetosMaisComuns.map((trajeto, index) => (
                                        <div key={index} className="flex justify-between items-center border-b pb-2">
                                            <div>
                                                <span className="font-medium text-sm text-gray-500 mr-2">#{index + 1}</span>
                                                <span className="font-medium">{trajeto.partida}</span>
                                                <span className="text-gray-400 mx-2">→</span>
                                                <span className="font-medium">{trajeto.destino}</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="text-sm text-gray-500">{trajeto.total} viagens</span>
                                                <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-[#5D2A1A] rounded-full"
                                                        style={{
                                                            width: `${(trajeto.total / (trajetosMaisComuns[0]?.total || 1)) * 100}%`
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {trajetosMaisComuns.length === 0 && (
                                        <p className="text-center text-gray-500 py-8">Nenhum trajeto encontrado</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <MapPin className="h-5 w-5" />
                                        Endereços de Partida Mais Frequentes
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {partidasFrequentes.map((item, index) => (
                                            <div key={index} className="flex justify-between items-center border-b pb-2">
                                                <div>
                                                    <span className="font-medium text-sm text-gray-500 mr-2">#{index + 1}</span>
                                                    <span className="font-medium">{item.endereco}</span>
                                                    <span className="text-xs text-gray-500 ml-2">
                                                        ({item.funcionarios} funcionários)
                                                    </span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="font-medium">{item.totalViagens} viagens</span>
                                                    <span className="text-xs text-gray-500 block">
                                                        R$ {item.valorTotal.toLocaleString('pt-BR')}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                        {partidasFrequentes.length === 0 && (
                                            <p className="text-center text-gray-500 py-4">Nenhum dado encontrado</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <MapPin className="h-5 w-5" />
                                        Endereços de Destino Mais Frequentes
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {destinosFrequentes.map((item, index) => (
                                            <div key={index} className="flex justify-between items-center border-b pb-2">
                                                <div>
                                                    <span className="font-medium text-sm text-gray-500 mr-2">#{index + 1}</span>
                                                    <span className="font-medium">{item.endereco}</span>
                                                    <span className="text-xs text-gray-500 ml-2">
                                                        ({item.funcionarios} funcionários)
                                                    </span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="font-medium">{item.totalViagens} viagens</span>
                                                    <span className="text-xs text-gray-500 block">
                                                        R$ {item.valorTotal.toLocaleString('pt-BR')}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                        {destinosFrequentes.length === 0 && (
                                            <p className="text-center text-gray-500 py-4">Nenhum dado encontrado</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                {/* Aba - Horários Extras */}
                <TabsContent value="horarios">
                    <div className="space-y-6">
                        {/* Filtros específicos da aba */}
                        <Card>
                            <CardContent className="pt-6">
                                <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                                    <div>
                                        <label className="text-sm font-medium mb-2 block">Funcionário</label>
                                        <Select
                                            value={funcionarioFilter}
                                            onValueChange={(value) => {
                                                setFuncionarioFilter(value);
                                            }}
                                            disabled={loadingFiltros}
                                        >
                                            <SelectTrigger className="bg-white">
                                                <SelectValue placeholder="Todos os funcionários" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="todos">Todos os funcionários</SelectItem>
                                                {funcionariosList.map((f) => (
                                                    <SelectItem key={f} value={f}>
                                                        {f}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                {(funcionarioFilter !== 'todos' || programaFilter !== 'todos') && (
                                    <div className="mt-4 text-sm text-blue-600">
                                        Filtros ativos:
                                        {funcionarioFilter !== 'todos' && ` Funcionário: ${funcionarioFilter}`}
                                        {programaFilter !== 'todos' && ` Programa: ${programaFilter}`}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {horariosData ? (
                            <>
                                {/* Cards de resumo */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <Card>
                                        <CardContent className="p-6">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-medium text-gray-600">Antes das 8h</p>
                                                    <p className="text-2xl font-bold text-orange-500">
                                                        {horariosData.viagensAntes8}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        R$ {horariosData.valorAntes8.toLocaleString('pt-BR')}
                                                    </p>
                                                </div>
                                                <div className="p-3 bg-orange-100 rounded-full">
                                                    <Sunrise className="h-6 w-6 text-orange-500" />
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardContent className="p-6">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-medium text-gray-600">Depois das 17h</p>
                                                    <p className="text-2xl font-bold text-purple-500">
                                                        {horariosData.viagensDepois17}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        R$ {horariosData.valorDepois17.toLocaleString('pt-BR')}
                                                    </p>
                                                </div>
                                                <div className="p-3 bg-purple-100 rounded-full">
                                                    <Sunset className="h-6 w-6 text-purple-500" />
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardContent className="p-6">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-medium text-gray-600">Total Fora do Horário</p>
                                                    <p className="text-2xl font-bold text-red-500">
                                                        {horariosData.viagensForaHorario}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {horariosData.percentualForaHorario}% do total
                                                    </p>
                                                </div>
                                                <div className="p-3 bg-red-100 rounded-full">
                                                    <Clock className="h-6 w-6 text-red-500" />
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardContent className="p-6">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-medium text-gray-600">Total de Viagens</p>
                                                    <p className="text-2xl font-bold text-gray-900">
                                                        {horariosData.totalViagens}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        Fora do horário: {horariosData.viagensForaHorario}
                                                    </p>
                                                </div>
                                                <div className="p-3 bg-gray-100 rounded-full">
                                                    <Car className="h-6 w-6 text-gray-600" />
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Gráfico de distribuição por hora */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <BarChart3 className="h-5 w-5" />
                                            Distribuição por Hora do Dia
                                        </CardTitle>
                                        <p className="text-sm text-gray-600">
                                            Áreas em vermelho indicam horários fora do comercial (antes 8h e depois 17h)
                                        </p>
                                    </CardHeader>
                                    <CardContent>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={horariosData.distribuicaoPorHora}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="hora" />
                                                <YAxis yAxisId="left" />
                                                <YAxis yAxisId="right" orientation="right" />
                                                <Tooltip
                                                    formatter={(value, name) => {
                                                        if (name === 'valor') return `R$ ${Number(value).toLocaleString('pt-BR')}`;
                                                        return value;
                                                    }}
                                                />
                                                <Legend />
                                                <Bar yAxisId="left" dataKey="quantidade" fill="#5D2A1A" name="Viagens" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>

                                {/* Ranking de funcionários */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Users className="h-5 w-5" />
                                            Funcionários com Viagens Fora do Horário
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead>
                                                    <tr className="border-b">
                                                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Funcionário</th>
                                                        <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Antes 8h</th>
                                                        <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Depois 17h</th>
                                                        <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Total</th>
                                                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Valor Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {horariosData.rankingFuncionarios.map((func, index) => (
                                                        <tr key={func.nome} className="border-b hover:bg-gray-50">
                                                            <td className="py-3 px-4 font-medium">{func.nome}</td>
                                                            <td className="py-3 px-4 text-center">
                                                                <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs">
                                                                    {func.antes8}
                                                                </span>
                                                            </td>
                                                            <td className="py-3 px-4 text-center">
                                                                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                                                                    {func.depois17}
                                                                </span>
                                                            </td>
                                                            <td className="py-3 px-4 text-center font-medium">{func.total}</td>
                                                            <td className="py-3 px-4 text-right">
                                                                R$ {func.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {horariosData.rankingFuncionarios.length === 0 && (
                                                        <tr>
                                                            <td colSpan={5} className="text-center py-8 text-gray-500">
                                                                Nenhum funcionário com viagens fora do horário
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Últimas viagens fora do horário */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Clock className="h-5 w-5" />
                                            Últimas Viagens Fora do Horário
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="border-b">
                                                        <th className="text-left py-2 px-3 font-medium text-gray-600">Data</th>
                                                        <th className="text-left py-2 px-3 font-medium text-gray-600">Hora</th>
                                                        <th className="text-left py-2 px-3 font-medium text-gray-600">Funcionário</th>
                                                        <th className="text-left py-2 px-3 font-medium text-gray-600">Serviço</th>
                                                        <th className="text-left py-2 px-3 font-medium text-gray-600">Destino</th>
                                                        <th className="text-right py-2 px-3 font-medium text-gray-600">Valor</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {horariosData.ultimasViagens.map((viagem) => (
                                                        <tr key={viagem.id} className="border-b hover:bg-gray-50">
                                                            <td className="py-2 px-3">
                                                                {new Date(viagem.dataSolicitacao).toLocaleDateString('pt-BR')}
                                                            </td>
                                                            <td className="py-2 px-3 font-mono">
                                                                {viagem.horaSolicitacao}
                                                            </td>
                                                            <td className="py-2 px-3">{viagem.nomeCompleto}</td>
                                                            <td className="py-2 px-3">{viagem.servico || '-'}</td>
                                                            <td className="py-2 px-3 max-w-[150px] truncate">
                                                                {viagem.enderecoDestino || '-'}
                                                            </td>
                                                            <td className="py-2 px-3 text-right font-medium">
                                                                R$ {Number(viagem.valorTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {horariosData.ultimasViagens.length === 0 && (
                                                        <tr>
                                                            <td colSpan={6} className="text-center py-8 text-gray-500">
                                                                Nenhuma viagem fora do horário encontrada
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </CardContent>
                                </Card>
                            </>
                        ) : (
                            <p className="text-center text-gray-500 py-8">Carregando dados de horários...</p>
                        )}
                    </div>
                </TabsContent>
            </Tabs>

            {/* Rodapé */}
            <div className="text-center text-xs text-gray-500 py-4">
                Dados atualizados automaticamente a partir das planilhas importadas
            </div>
        </div>
    );
}