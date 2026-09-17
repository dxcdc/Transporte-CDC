import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { corridaStatus } from '@prisma/client';

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
        const grupo = searchParams.get('grupo');
        const programa = searchParams.get('programa');
        const dataInicioStr = searchParams.get('dataInicio');
        const dataFimStr = searchParams.get('dataFim');
        const plataforma = searchParams.get('plataforma');
        const status = searchParams.get('status');

        console.log('📊 Parâmetros recebidos:', { grupo, programa, dataInicioStr, dataFimStr, plataforma });

        const where: any = {
            nomeCompleto: { not: null },
        };

        if (plataforma && plataforma !== 'todos') {
            where.plataforma = plataforma;
        }

        if (grupo && grupo !== '' && grupo !== 'todos') {
            where.grupo = grupo;
        }

        if (programa && programa !== '' && programa !== 'todos') {
            where.programa = programa;
        }

        if (status && status !== 'todos') {
            where.status = status;
        }

        // Filtro por data
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

        console.log('🔍 Where clause final:', JSON.stringify(where));

        const corridas = await prisma.corrida.findMany({
            where,
            select: {
                nome: true,
                sobrenome: true,
                nomeCompleto: true,
                email: true,
                grupo: true,
                programa: true,
                servico: true,
                cidade: true,
                pais: true,
                valorTotal: true,
            },
        });

        console.log(`📊 Encontradas ${corridas.length} corridas`);

        interface FuncionarioGroup {
            id: string;
            nome: string;
            sobrenome: string;
            nomeCompleto: string;
            email: string;
            titulo: string;
            grupo: string;
            programa: string;
            servico: string;
            cidade: string;
            pais: string;
            totalViagens: number;
            valorTotal: number;
            nomesFrequencia: Map<string, number>;
        }

        const funcionariosMap = new Map<string, FuncionarioGroup>();

        for (const c of corridas) {
            const nomeOriginal = c.nomeCompleto;
            if (!nomeOriginal) continue;

            const emailClean = c.email ? c.email.trim().toLowerCase() : '';
            const chaveNormalizada = emailClean ? `EMAIL:${emailClean}` : `NOME:${normalizarTexto(nomeOriginal)}`;

            if (!funcionariosMap.has(chaveNormalizada)) {
                funcionariosMap.set(chaveNormalizada, {
                    id: chaveNormalizada,
                    nome: c.nome || '',
                    sobrenome: c.sobrenome || '',
                    nomeCompleto: nomeOriginal,
                    email: c.email || '',
                    titulo: 'Funcionário',
                    grupo: c.grupo || '',
                    programa: c.programa || '',
                    servico: c.servico || '',
                    cidade: c.cidade || '',
                    pais: c.pais || '',
                    totalViagens: 0,
                    valorTotal: 0,
                    nomesFrequencia: new Map(),
                });
            }

            const func = funcionariosMap.get(chaveNormalizada)!;
            func.totalViagens++;
            if (c.valorTotal) {
                func.valorTotal += Number(c.valorTotal);
            }

            if (!func.email && c.email) {
                func.email = c.email;
            }

            func.nomesFrequencia.set(nomeOriginal, (func.nomesFrequencia.get(nomeOriginal) || 0) + 1);
        }

        // Selecionar o nomeCompleto mais frequente e legível para cada funcionário
        const funcionarios = Array.from(funcionariosMap.values())
            .map(({ nomesFrequencia, ...func }) => {
                let melhorNome = func.nomeCompleto;
                let maiorFreq = -1;

                for (const [nome, freq] of nomesFrequencia.entries()) {
                    if (freq > maiorFreq) {
                        maiorFreq = freq;
                        melhorNome = nome;
                    }
                }

                return {
                    ...func,
                    nomeCompleto: melhorNome,
                };
            })
            .sort((a, b) => b.valorTotal - a.valorTotal);

        console.log(`📊 Total de funcionários unificados: ${funcionarios.length}`);

        return NextResponse.json(funcionarios);
    } catch (error) {
        console.error('❌ Erro ao buscar funcionários:', error);
        return NextResponse.json(
            { error: 'Erro ao buscar dados', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}