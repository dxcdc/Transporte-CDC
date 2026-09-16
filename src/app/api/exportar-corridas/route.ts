import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function normalizarTexto(texto: string): string {
    if (!texto) return '';
    return texto
        .toUpperCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const tudo = searchParams.get('tudo') === 'true';

        const where: any = {};

        if (!tudo) {
            const dataInicioStr = searchParams.get('dataInicio');
            const dataFimStr = searchParams.get('dataFim');
            const plataforma = searchParams.get('plataforma');
            const status = searchParams.get('status');
            const programa = searchParams.get('programa');
            const grupo = searchParams.get('grupo');
            const funcionario = searchParams.get('funcionario');

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

            if (programa && programa !== 'todos') {
                where.programa = programa;
            }

            if (grupo && grupo !== 'todos') {
                where.grupo = grupo;
            }

            if (funcionario && funcionario !== 'todos') {
                where.nomeCompleto = {
                    contains: funcionario,
                    mode: 'insensitive',
                };
            }
        }

        let corridas = await prisma.corrida.findMany({
            where,
            orderBy: {
                dataSolicitacao: 'desc',
            },
        });

        const funcionario = searchParams.get('funcionario');
        if (!tudo && funcionario && funcionario !== 'todos') {
            const funcNorm = normalizarTexto(funcionario);
            corridas = corridas.filter(c => normalizarTexto(c.nomeCompleto || '') === funcNorm);
        }

        return NextResponse.json({ corridas });
    } catch (error) {
        console.error('Erro ao exportar corridas:', error);
        return NextResponse.json(
            { error: 'Erro ao buscar dados para exportação' },
            { status: 500 }
        );
    }
}
