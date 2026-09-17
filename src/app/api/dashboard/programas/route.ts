import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { FileParser } from '@/lib/import/file-parser';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const dataInicioStr = searchParams.get('dataInicio');
        const dataFimStr = searchParams.get('dataFim');
        const plataforma = searchParams.get('plataforma');
        const status = searchParams.get('status');

        const where: any = {
            programa: { not: null },
        };

        if (plataforma && plataforma !== 'todos') {
            where.plataforma = plataforma;
        }

        if (status && status !== 'todos') {
            where.status = status;
        }

        if (dataInicioStr) {
            const dataInicio = new Date(dataInicioStr);
            if (!isNaN(dataInicio.getTime())) {
                dataInicio.setHours(0, 0, 0, 0);
                where.dataSolicitacao = { gte: dataInicio };
            }
        }

        if (dataFimStr) {
            const dataFim = new Date(dataFimStr);
            if (!isNaN(dataFim.getTime())) {
                dataFim.setHours(23, 59, 59, 999);
                where.dataSolicitacao = { ...where.dataSolicitacao, lte: dataFim };
            }
        }

        const corridas = await prisma.corrida.findMany({
            where,
            select: {
                programa: true,
                valorTotal: true,
            },
        });

        const programasMap = new Map<string, { nome: string; valor: number; viagens: number }>();

        corridas.forEach((c) => {
            if (!c.programa) return;
            const nomeNorm = FileParser.normalizarNomePrograma(c.programa);
            if (!nomeNorm) return;

            if (!programasMap.has(nomeNorm)) {
                programasMap.set(nomeNorm, {
                    nome: nomeNorm,
                    valor: 0,
                    viagens: 0,
                });
            }

            const item = programasMap.get(nomeNorm)!;
            item.viagens++;
            if (c.valorTotal) {
                item.valor += Number(c.valorTotal);
            }
        });

        const dados = Array.from(programasMap.values()).sort((a, b) => b.valor - a.valor);

        return NextResponse.json(dados);
    } catch (error) {
        console.error('Erro ao buscar programas:', error);
        return NextResponse.json({ error: 'Erro ao buscar dados' }, { status: 500 });
    }
}