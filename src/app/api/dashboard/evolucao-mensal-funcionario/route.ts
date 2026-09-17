import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const nomeCompleto = searchParams.get("nomeCompleto");
        const email = searchParams.get("email");
        const dataInicio = searchParams.get("dataInicio");
        const dataFim = searchParams.get("dataFim");
        const plataforma = searchParams.get("plataforma");
        const status = searchParams.get("status");
        const programa = searchParams.get("programa");

        if (!nomeCompleto && !email) {
            return NextResponse.json(
                { error: "Nome ou email do funcionário é obrigatório" },
                { status: 400 }
            );
        }

        // Construir filtro
        const where: any = {};

        if (email && email.trim() !== "") {
            where.email = { equals: email.trim(), mode: 'insensitive' };
        } else if (nomeCompleto) {
            where.nomeCompleto = { equals: nomeCompleto, mode: 'insensitive' };
        }

        let dataInicioDate: Date | null = null;
        let dataFimDate: Date | null = null;

        if (dataInicio && dataInicio !== "") {
            dataInicioDate = new Date(dataInicio);
            dataInicioDate.setHours(0, 0, 0, 0);
            where.dataSolicitacao = { gte: dataInicioDate };
        }

        if (dataFim && dataFim !== "") {
            dataFimDate = new Date(dataFim);
            dataFimDate.setHours(23, 59, 59, 999);
            where.dataSolicitacao = { ...where.dataSolicitacao, lte: dataFimDate };
        }

        if (plataforma && plataforma !== "todos") {
            where.plataforma = plataforma;
        }

        if (status && status !== "todos") {
            where.status = status;
        }

        if (programa && programa !== "todos") {
            where.programa = programa;
        }

        // Buscar corridas do funcionário
        const corridas = await prisma.corrida.findMany({
            where,
            select: {
                dataSolicitacao: true,
                valorTotal: true,
                plataforma: true,
                servico: true,
            },
            orderBy: {
                dataSolicitacao: 'asc',
            },
        });

        // Verificar se o filtro é para um único mês (mesmo mês e ano)
        const isSingleMonth = dataInicioDate && dataFimDate &&
            dataInicioDate.getMonth() === dataFimDate.getMonth() &&
            dataInicioDate.getFullYear() === dataFimDate.getFullYear();

        let evolucao: any[] = [];
        let agrupamentoLabel = '';

        if (isSingleMonth && dataInicioDate && dataFimDate) {
            // 🔥 AGREGAR POR DIA (para um único mês)
            agrupamentoLabel = 'dia';
            const diasMap = new Map<string, { dia: string; valor: number; viagens: number }>();

            // Criar todos os dias do mês
            const ano = dataInicioDate.getFullYear();
            const mes = dataInicioDate.getMonth();
            const ultimoDia = new Date(ano, mes + 1, 0).getDate();

            for (let d = 1; d <= ultimoDia; d++) {
                const dataStr = `${String(d).padStart(2, '0')}/${String(mes + 1).padStart(2, '0')}/${ano}`;
                diasMap.set(dataStr, {
                    dia: dataStr,
                    valor: 0,
                    viagens: 0,
                });
            }

            // Preencher com os dados das corridas
            corridas.forEach(corrida => {
                if (!corrida.dataSolicitacao) return;
                const data = new Date(corrida.dataSolicitacao);
                const dia = data.getDate();
                const dataStr = `${String(dia).padStart(2, '0')}/${String(mes + 1).padStart(2, '0')}/${ano}`;

                if (diasMap.has(dataStr)) {
                    const item = diasMap.get(dataStr)!;
                    item.valor += Number(corrida.valorTotal) || 0;
                    item.viagens++;
                }
            });

            evolucao = Array.from(diasMap.values());
        } else {
            // 🔥 AGREGAR POR MÊS (para múltiplos meses ou sem filtro)
            agrupamentoLabel = 'mes';
            const mesesMap = new Map<string, { mes: string; valor: number; viagens: number }>();

            corridas.forEach(corrida => {
                if (!corrida.dataSolicitacao) return;
                const data = new Date(corrida.dataSolicitacao);
                const mesAno = `${String(data.getMonth() + 1).padStart(2, '0')}/${data.getFullYear()}`;

                if (!mesesMap.has(mesAno)) {
                    mesesMap.set(mesAno, {
                        mes: mesAno,
                        valor: 0,
                        viagens: 0,
                    });
                }

                const item = mesesMap.get(mesAno)!;
                item.valor += Number(corrida.valorTotal) || 0;
                item.viagens++;
            });

            evolucao = Array.from(mesesMap.values())
                .sort((a, b) => {
                    const [mesA, anoA] = a.mes.split('/');
                    const [mesB, anoB] = b.mes.split('/');
                    return new Date(parseInt(anoA), parseInt(mesA) - 1).getTime() -
                        new Date(parseInt(anoB), parseInt(mesB) - 1).getTime();
                });
        }

        // Calcular total geral
        const totalViagens = corridas.length;
        const totalValor = corridas.reduce((sum, c) => sum + Number(c.valorTotal || 0), 0);

        return NextResponse.json({
            evolucaoMensal: evolucao,
            totalViagens,
            totalValor,
            agrupamento: agrupamentoLabel,
        });
    } catch (error) {
        console.error("Erro ao buscar evolução mensal do funcionário:", error);
        return NextResponse.json(
            { error: "Erro ao buscar dados" },
            { status: 500 }
        );
    }
}