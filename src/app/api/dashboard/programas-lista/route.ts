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

        if (plataforma && plataforma !== 'todos') {
            where.plataforma = plataforma;
        }

        if (status && status !== 'todos') {
            where.status = status;
        }

        const corridas = await prisma.corrida.findMany({
            where,
            select: { programa: true },
        });

        const programasSet = new Set<string>();

        corridas.forEach(c => {
            if (!c.programa) return;
            const norm = FileParser.normalizarNomePrograma(c.programa);
            if (norm) {
                programasSet.add(norm);
            }
        });

        const nomes = Array.from(programasSet).sort();

        return NextResponse.json(nomes);
    } catch (error) {
        console.error('Erro ao buscar programas:', error);
        return NextResponse.json([], { status: 500 });
    }
}