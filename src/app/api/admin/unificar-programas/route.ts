import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { FileParser } from '@/lib/import/file-parser';

export async function GET() {
    try {
        const corridas = await prisma.corrida.findMany({
            where: {
                programa: { not: null },
            },
            select: {
                id: true,
                programa: true,
            },
        });

        let updatedCount = 0;
        const updates: Record<string, string> = {};

        for (const c of corridas) {
            if (!c.programa) continue;

            const novoNome = FileParser.normalizarNomePrograma(c.programa);
            if (novoNome && novoNome !== c.programa) {
                updates[c.programa] = novoNome;
                await prisma.corrida.update({
                    where: { id: c.id },
                    data: { programa: novoNome },
                });
                updatedCount++;
            }
        }

        return NextResponse.json({
            success: true,
            message: `Unificação concluída no banco de dados! ${updatedCount} corridas foram atualizadas.`,
            totalProcessado: corridas.length,
            mapeamento: updates,
        });
    } catch (error: any) {
        console.error('Erro ao unificar programas:', error);
        return NextResponse.json(
            { error: 'Erro ao unificar programas no banco de dados', details: error.message },
            { status: 500 }
        );
    }
}
