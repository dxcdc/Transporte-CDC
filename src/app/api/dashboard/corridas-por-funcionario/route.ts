import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Plataforma } from '@prisma/client';

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
        const nomeCompleto = searchParams.get('nomeCompleto');
        const email = searchParams.get('email');
        const dataInicioStr = searchParams.get('dataInicio');
        const dataFimStr = searchParams.get('dataFim');
        const programa = searchParams.get('programa');
        const plataformaParam = searchParams.get('plataforma');

        if (!nomeCompleto && !email) {
            return NextResponse.json(
                { error: 'Nome ou email do funcionário é obrigatório' },
                { status: 400 }
            );
        }

        const emailClean = email ? email.trim().toLowerCase() : '';
        const nomeNormalizado = normalizarTexto(nomeCompleto || '');

        const where: any = {};

        if (programa && programa !== 'todos') {
            where.programa = programa;
        }

        if (plataformaParam && plataformaParam !== 'todos') {
            where.plataforma = plataformaParam as Plataforma;
        }

        if (dataInicioStr && dataInicioStr !== '') {
            const dataInicio = new Date(dataInicioStr);
            if (!isNaN(dataInicio.getTime())) {
                dataInicio.setHours(0, 0, 0, 0);
                where.dataSolicitacao = { gte: dataInicio };
            }
        }

        if (dataFimStr && dataFimStr !== '') {
            const dataFim = new Date(dataFimStr);
            if (!isNaN(dataFim.getTime())) {
                dataFim.setHours(23, 59, 59, 999);
                where.dataSolicitacao = { ...where.dataSolicitacao, lte: dataFim };
            }
        }

        const todasCorridas = await prisma.corrida.findMany({
            where,
            orderBy: { dataSolicitacao: 'desc' },
            select: {
                id: true,
                dataSolicitacao: true,
                horaSolicitacao: true,
                horaChegada: true,
                enderecoPartida: true,
                enderecoDestino: true,
                servico: true,
                grupo: true,
                detalhamentoDespesa: true,
                valorTotal: true,
                distanciaMetros: true,
                plataforma: true,
                nomeCompleto: true,
                email: true,
            },
        });

        const corridas = todasCorridas.filter(c => {
            if (emailClean && c.email && c.email.trim().toLowerCase() === emailClean) {
                return true;
            }
            return normalizarTexto(c.nomeCompleto || '') === nomeNormalizado;
        });

        const MILHAS_PARA_KM = 1.60934;

        const dados = corridas.map(c => {
            let distanciaKm = 0;

            if (c.distanciaMetros) {
                const valorDistancia = Number(c.distanciaMetros);

                if (c.plataforma === 'UBER') {
                    distanciaKm = Number((valorDistancia * MILHAS_PARA_KM).toFixed(1));
                } else {
                    distanciaKm = Number(valorDistancia.toFixed(1));
                }
            }

            return {
                id: c.id,
                dataSolicitacao: c.dataSolicitacao ? c.dataSolicitacao.toISOString() : '',
                horaSolicitacao: c.horaSolicitacao || '',
                horaChegada: c.horaChegada || '',
                enderecoPartida: c.enderecoPartida || '',
                enderecoDestino: c.enderecoDestino || '',
                servico: c.servico || '',
                grupo: c.grupo || '',
                detalhamentoDespesa: c.detalhamentoDespesa || '',
                valorTotal: c.valorTotal ? Number(c.valorTotal) : 0,
                distanciaKm: distanciaKm,
            };
        });

        console.log(`📏 Encontradas ${dados.length} corridas para ${nomeCompleto}`);

        return NextResponse.json(dados);
    } catch (error) {
        console.error('❌ Erro ao buscar corridas:', error);
        return NextResponse.json(
            { error: 'Erro ao buscar dados' },
            { status: 500 }
        );
    }
}