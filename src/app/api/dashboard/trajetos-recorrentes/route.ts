import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const dataInicio = searchParams.get("dataInicio");
        const dataFim = searchParams.get("dataFim");
        const plataforma = searchParams.get("plataforma");
        const status = searchParams.get("status");
        const programa = searchParams.get("programa");
        const limit = parseInt(searchParams.get("limit") || "10");

        // Construir filtro
        const where: any = {};

        if (dataInicio && dataInicio !== "") {
            const inicioDate = new Date(dataInicio);
            if (!isNaN(inicioDate.getTime())) {
                inicioDate.setHours(0, 0, 0, 0);
                where.dataSolicitacao = { gte: inicioDate };
            }
        }

        if (dataFim && dataFim !== "") {
            const fimDate = new Date(dataFim);
            if (!isNaN(fimDate.getTime())) {
                fimDate.setHours(23, 59, 59, 999);
                where.dataSolicitacao = { ...where.dataSolicitacao, lte: fimDate };
            }
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

        // Buscar todas as corridas com endereços
        const corridas = await prisma.corrida.findMany({
            where: {
                ...where,
                OR: [
                    { enderecoPartida: { not: null } },
                    { enderecoDestino: { not: null } }
                ]
            },
            select: {
                enderecoPartida: true,
                enderecoDestino: true,
                valorTotal: true,
                nomeCompleto: true,
                dataSolicitacao: true,
            }
        });

        // Função para converter qualquer valor para número
        const toNumber = (value: any): number => {
            if (value === null || value === undefined) return 0;
            if (typeof value === 'number') return value;
            if (typeof value === 'string') return parseFloat(value) || 0;
            if (value && typeof value.toNumber === 'function') return value.toNumber();
            return 0;
        };

        // Função para gerar uma chave única normalizada para agrupamento de endereços
        function normalizarEnderecoKey(endereco: string): string {
            if (!endereco) return '';

            let norm = endereco.toUpperCase().trim();

            // 1. Remover sufixos de país no final
            norm = norm.replace(/,?\s*BRASIL$/i, '');

            // 2. Expandir abreviações comuns de logradouro e bairros
            norm = norm.replace(/\bR\.\s*/gi, 'RUA ');
            norm = norm.replace(/\bAV\.\s*/gi, 'AVENIDA ');
            norm = norm.replace(/\bAV\b/gi, 'AVENIDA');
            norm = norm.replace(/\bTV\.\s*/gi, 'TRAVESSA ');
            norm = norm.replace(/\bTV\b/gi, 'TRAVESSA');
            norm = norm.replace(/\bSTO\.\s*/gi, 'SANTO ');
            norm = norm.replace(/\bSTO\b/gi, 'SANTO');
            norm = norm.replace(/\bSTA\.\s*/gi, 'SANTA ');
            norm = norm.replace(/\bSTA\b/gi, 'SANTA');
            norm = norm.replace(/\bDR\.\s*/gi, 'DOUTOR ');
            norm = norm.replace(/\bPROF\.\s*/gi, 'PROFESSOR ');

            // 3. Remover CEPs (ex: 50050-135, 50050-100)
            norm = norm.replace(/\b\d{5}-?\d{3}\b/g, '');

            // 4. Normalizar acentos
            norm = norm.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

            // 5. Se tiver padrão "LOGRADOURO, NUMERO", isolar "LOGRADOURO + NUMERO + CIDADE"
            const match = norm.match(/^([A-Z0-9\s]+?)[,\s]+(\d+|S\/N)\b/i);
            if (match) {
                const ruaClean = match[1].replace(/[-–—,/.]/g, ' ').replace(/\s+/g, ' ').trim();
                const numClean = match[2];

                let cidade = '';
                if (norm.includes('RECIFE')) cidade = 'RECIFE';
                else if (norm.includes('OLINDA')) cidade = 'OLINDA';
                else if (norm.includes('JABOATAO')) cidade = 'JABOATAO';
                else if (norm.includes('PAULISTA')) cidade = 'PAULISTA';
                else if (norm.includes('CABO')) cidade = 'CABO';

                return `${ruaClean} ${numClean} ${cidade}`.trim();
            }

            norm = norm.replace(/[-–—,/.]/g, ' ').replace(/\s+/g, ' ').trim();
            return norm;
        }

        // Limpar sufixo irrelevante para exibição
        function limparEnderecoExibicao(endereco: string): string {
            if (!endereco) return '';
            let limpo = endereco.trim();
            limpo = limpo.replace(/,?\s*Brasil$/i, '');
            return limpo;
        }

        interface EnderecoGroup {
            key: string;
            total: number;
            valor: number;
            funcionarios: Set<string>;
            variacoesExibicao: Map<string, number>;
        }

        function registrarEndereco(
            mapa: Map<string, EnderecoGroup>,
            rawAddress: string,
            valor: number,
            funcionario?: string | null
        ) {
            const key = normalizarEnderecoKey(rawAddress);
            if (!key) return;

            if (!mapa.has(key)) {
                mapa.set(key, {
                    key,
                    total: 0,
                    valor: 0,
                    funcionarios: new Set(),
                    variacoesExibicao: new Map(),
                });
            }

            const group = mapa.get(key)!;
            group.total++;
            group.valor += valor;
            if (funcionario) group.funcionarios.add(funcionario);

            const limpo = limparEnderecoExibicao(rawAddress);
            group.variacoesExibicao.set(limpo, (group.variacoesExibicao.get(limpo) || 0) + 1);
        }

        function obterMelhorNomeExibicao(group: EnderecoGroup): string {
            let melhorNome = group.key;
            let maiorCount = -1;

            for (const [nome, count] of group.variacoesExibicao.entries()) {
                if (count > maiorCount) {
                    maiorCount = count;
                    melhorNome = nome;
                }
            }

            return melhorNome;
        }

        // Agrupar por endereço de partida
        const partidasMap = new Map<string, EnderecoGroup>();
        corridas.forEach(c => {
            if (c.enderecoPartida && c.enderecoPartida.trim() !== "") {
                registrarEndereco(partidasMap, c.enderecoPartida, toNumber(c.valorTotal), c.nomeCompleto);
            }
        });

        // Agrupar por endereço de destino
        const destinosMap = new Map<string, EnderecoGroup>();
        corridas.forEach(c => {
            if (c.enderecoDestino && c.enderecoDestino.trim() !== "") {
                registrarEndereco(destinosMap, c.enderecoDestino, toNumber(c.valorTotal), c.nomeCompleto);
            }
        });

        // Agrupar trajetos completos
        interface TrajetoGroup {
            keyPartida: string;
            keyDestino: string;
            partidasVariacoes: Map<string, number>;
            destinosVariacoes: Map<string, number>;
            total: number;
        }

        const trajetosMap = new Map<string, TrajetoGroup>();

        corridas.forEach(c => {
            if (c.enderecoPartida && c.enderecoDestino && c.enderecoPartida.trim() !== "" && c.enderecoDestino.trim() !== "") {
                const keyPartida = normalizarEnderecoKey(c.enderecoPartida);
                const keyDestino = normalizarEnderecoKey(c.enderecoDestino);

                if (keyPartida && keyDestino) {
                    const key = `${keyPartida}→${keyDestino}`;

                    if (!trajetosMap.has(key)) {
                        trajetosMap.set(key, {
                            keyPartida,
                            keyDestino,
                            partidasVariacoes: new Map(),
                            destinosVariacoes: new Map(),
                            total: 0,
                        });
                    }

                    const tGroup = trajetosMap.get(key)!;
                    tGroup.total++;

                    const pLimpo = limparEnderecoExibicao(c.enderecoPartida);
                    const dLimpo = limparEnderecoExibicao(c.enderecoDestino);

                    tGroup.partidasVariacoes.set(pLimpo, (tGroup.partidasVariacoes.get(pLimpo) || 0) + 1);
                    tGroup.destinosVariacoes.set(dLimpo, (tGroup.destinosVariacoes.get(dLimpo) || 0) + 1);
                }
            }
        });

        // Ordenar e formatar resultados
        const partidasFrequentes = Array.from(partidasMap.values())
            .map(group => ({
                endereco: obterMelhorNomeExibicao(group),
                totalViagens: group.total,
                valorTotal: group.valor,
                valorMedio: group.total > 0 ? group.valor / group.total : 0,
                funcionarios: group.funcionarios.size
            }))
            .sort((a, b) => b.totalViagens - a.totalViagens)
            .slice(0, limit);

        const destinosFrequentes = Array.from(destinosMap.values())
            .map(group => ({
                endereco: obterMelhorNomeExibicao(group),
                totalViagens: group.total,
                valorTotal: group.valor,
                valorMedio: group.total > 0 ? group.valor / group.total : 0,
                funcionarios: group.funcionarios.size
            }))
            .sort((a, b) => b.totalViagens - a.totalViagens)
            .slice(0, limit);

        const trajetosMaisComuns = Array.from(trajetosMap.values())
            .map(tGroup => {
                let melhorPartida = tGroup.keyPartida;
                let maxP = -1;
                for (const [p, count] of tGroup.partidasVariacoes.entries()) {
                    if (count > maxP) {
                        maxP = count;
                        melhorPartida = p;
                    }
                }

                let melhorDestino = tGroup.keyDestino;
                let maxD = -1;
                for (const [d, count] of tGroup.destinosVariacoes.entries()) {
                    if (count > maxD) {
                        maxD = count;
                        melhorDestino = d;
                    }
                }

                return {
                    partida: melhorPartida,
                    destino: melhorDestino,
                    total: tGroup.total,
                };
            })
            .sort((a, b) => b.total - a.total)
            .slice(0, limit);

        return NextResponse.json({
            partidasFrequentes,
            destinosFrequentes,
            trajetosMaisComuns,
            totalCorridas: corridas.length,
        });
    } catch (error) {
        console.error("Erro ao buscar trajetos recorrentes:", error);
        return NextResponse.json(
            { error: "Erro ao buscar dados" },
            { status: 500 }
        );
    }
}