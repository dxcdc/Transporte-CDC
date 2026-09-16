import * as XLSX from 'xlsx';

export function exportarCorridasParaExcel(corridas: any[], nomeArquivo: string) {
    const dadosExcel = corridas.map((c) => {
        const dataSolicitacaoStr = c.dataSolicitacao
            ? new Date(c.dataSolicitacao).toISOString().split('T')[0]
            : '';
        const dataChegadaStr = c.dataChegada
            ? new Date(c.dataChegada).toISOString().split('T')[0]
            : '';

        let distanciaKm = 0;
        if (c.distanciaKm != null) {
            distanciaKm = Number(c.distanciaKm);
        } else if (c.distanciaMetros != null) {
            const metros = Number(c.distanciaMetros);
            if (c.plataforma === 'UBER') {
                distanciaKm = Number((metros * 1.60934).toFixed(2));
            } else {
                distanciaKm = Number(metros.toFixed(2));
            }
        }

        return {
            'ID da Corrida': c.idCorridaPlataforma || c.id || '',
            'Plataforma': c.plataforma || '',
            'Data Solicitação': dataSolicitacaoStr,
            'Hora Solicitação': c.horaSolicitacao || '',
            'Data Chegada': dataChegadaStr,
            'Hora Chegada': c.horaChegada || '',
            'Serviço': c.servico || '',
            'Programa': c.programa || '',
            'Grupo': c.grupo || '',
            'Nome': c.nome || '',
            'Sobrenome': c.sobrenome || '',
            'Nome Completo': c.nomeCompleto || '',
            'Email': c.email || '',
            'Detalhamento da despesa': c.detalhamentoDespesa || '',
            'Valor Total': c.valorTotal != null ? Number(c.valorTotal) : 0,
            'Distância (km)': distanciaKm,
            'Duração (min)': c.duracaoMinutos != null ? Number(c.duracaoMinutos) : 0,
            'Endereço Partida': c.enderecoPartida || '',
            'Endereço Destino': c.enderecoDestino || '',
            'Cidade': c.cidade || '',
            'País': c.pais || '',
            'Status': c.status || '',
        };
    });

    const worksheet = XLSX.utils.json_to_sheet(dadosExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Corridas');

    XLSX.writeFile(workbook, `${nomeArquivo}.xlsx`);
}
