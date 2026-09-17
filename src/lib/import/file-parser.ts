import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { PlanilhaCorrida } from './types';

export class FileParser {

    static async parseFile(file: File): Promise<PlanilhaCorrida[]> {
        const extension = file.name.split('.').pop()?.toLowerCase();

        if (extension === 'csv') {
            return this.parseCSV(file);
        } else if (extension === 'xlsx' || extension === 'xls') {
            return this.parseExcel(file);
        } else {
            throw new Error('Formato não suportado. Use CSV ou Excel (.xlsx, .xls)');
        }
    }

    private static parseCSV(file: File): Promise<PlanilhaCorrida[]> {
        return new Promise((resolve, reject) => {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    const dados = results.data.map((row: any) => this.mapRowToCorrida(row));
                    resolve(dados);
                },
                error: (error) => reject(error),
            });
        });
    }

    private static async parseExcel(file: File): Promise<PlanilhaCorrida[]> {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(firstSheet);

        const dados = rows.map((row: any) => this.mapRowToCorrida(row));
        return dados;
    }

    private static parseDateValue(dateValue: any): Date | null {
        if (!dateValue) return null;
        if (dateValue instanceof Date && !isNaN(dateValue.getTime())) return dateValue;
        if (typeof dateValue === 'number') {
            const excelEpoch = new Date(1899, 11, 30);
            const date = new Date(excelEpoch.getTime() + dateValue * 86400000);
            if (!isNaN(date.getTime())) return date;
        }
        if (typeof dateValue === 'string') {
            let parts = dateValue.split(/[/-]/);
            if (parts.length === 3) {
                const day = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1;
                const year = parseInt(parts[2], 10);
                const date = new Date(year, month, day);
                if (!isNaN(date.getTime())) return date;
            }
            const isoDate = new Date(dateValue);
            if (!isNaN(isoDate.getTime())) return isoDate;
        }
        return null;
    }

    private static parseTimeValue(timeValue: any): string {
        if (!timeValue) return '00:00';
        if (typeof timeValue === 'string') {
            if (timeValue.includes(':')) {
                return timeValue.substring(0, 5);
            }
            return timeValue;
        }
        if (typeof timeValue === 'number') {
            const totalSeconds = Math.round(timeValue * 86400);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        }
        return '00:00';
    }

    private static parseFloatExato(value: any): number {
        if (value === null || value === undefined || value === '') return 0;

        if (typeof value === 'number') {
            return value;
        }

        if (typeof value === 'string') {
            let str = value.trim();
            str = str.replace(',', '.');
            str = str.replace(/[^0-9.-]/g, '');
            const num = parseFloat(str);
            return isNaN(num) ? 0 : num;
        }

        return 0;
    }

    public static normalizarNomePrograma(programa: string): string {
        if (!programa) return '';
        const p = String(programa).trim();
        if (!p) return '';

        // Apenas ATITUDE RECIFE, ATITUDE CABO, ATITUDE JABOATÃO, ATITUDE CARUARU levam o prefixo NÚCLEO
        if (/^N[ÚU]CLEO\s+ATITUDE\s+RECIFE|^ATITUDE\s+RECIFE/i.test(p)) {
            return 'NÚCLEO ATITUDE RECIFE';
        }
        if (/^N[ÚU]CLEO\s+ATITUDE\s+CABO|^ATITUDE\s+CABO/i.test(p)) {
            return 'NÚCLEO ATITUDE CABO';
        }
        if (/^N[ÚU]CLEO\s+ATITUDE\s+JABOAT[AÃ]O|^ATITUDE\s+JABOAT[AÃ]O/i.test(p)) {
            return 'NÚCLEO ATITUDE JABOATÃO';
        }
        if (/^N[ÚU]CLEO\s+ATITUDE\s+CARUARU|^ATITUDE\s+CARUARU/i.test(p)) {
            return 'NÚCLEO ATITUDE CARUARU';
        }

        // PPCAAM (sem NÚCLEO, unifica PPCAAM e PPCAAM II)
        if (/^N[ÚU]CLEO\s+PPCAAM|^PPCAAM/i.test(p)) {
            return 'PPCAAM';
        }

        // PROVITA (sem NÚCLEO, unifica PROVITA e Provita II)
        if (/^N[ÚU]CLEO\s+PROVITA|^PROVITA/i.test(p)) {
            return 'PROVITA';
        }

        // BEM VIVER OLINDA (unifica BEM VIVER OLINDA e Bem Viver Olinda)
        if (/^N[ÚU]CLEO\s+BEM\s+VIVER\s+OLINDA|^BEM\s+VIVER\s+OLINDA/i.test(p)) {
            return 'BEM VIVER OLINDA';
        }

        // Mais Vida Recife
        if (/^N[ÚU]CLEO\s+MAIS\s+VIDA\s+RECIFE|^MAIS\s+VIDA\s+RECIFE/i.test(p)) {
            return 'Mais Vida Recife';
        }

        // Institucional
        if (/^N[ÚU]CLEO\s+INSTITUCIONAL|^INSTITUCIONAL/i.test(p)) {
            return 'Institucional';
        }

        // ATM
        if (/^N[ÚU]CLEO\s+ATM|^ATM/i.test(p)) {
            return 'ATM';
        }

        // Articulação
        if (/^N[ÚU]CLEO\s+ARTICULA[CÇ][AÃ]O|^ARTICULA[CÇ][AÃ]O/i.test(p)) {
            return 'Articulação';
        }

        // Geral
        if (/^N[ÚU]CLEO\s+GERAL|^GERAL/i.test(p)) {
            return 'Geral';
        }

        // CDC
        if (/^N[ÚU]CLEO\s+CDC|^CDC/i.test(p)) {
            return 'CDC';
        }

        // Cais Olinda
        if (/^N[ÚU]CLEO\s+CAIS\s+OLINDA|^CAIS\s+OLINDA/i.test(p)) {
            return 'Cais Olinda';
        }

        // Longevidade com Articulação
        if (/^N[ÚU]CLEO\s+LONGEVIDADE|^LONGEVIDADE/i.test(p)) {
            return 'Longevidade com Articulação';
        }

        // Se porventura receber "NÚCLEO ...", remove "NÚCLEO " dos demais
        if (/^N[ÚU]CLEO\s+/i.test(p)) {
            return p.replace(/^N[ÚU]CLEO\s+/i, '').trim();
        }

        return p;
    }

    private static mapRowToCorrida(row: any): PlanilhaCorrida {
        const rawDataSolicitacao = row['Data Solicitação'] || row['data_solicitacao'] || row['Request Date'];
        const rawDataChegada = row['Data Chegada'] || row['data_chegada'] || row['Drop-off Date'];
        const rawHoraSolicitacao = row['Hora Solicitação'] || row['hora_solicitacao'] || row['Request Time'];
        const rawHoraChegada = row['Hora Chegada'] || row['hora_chegada'] || row['Drop-off Time'];

        let plataforma: 'UBER' | 'NOVE_NOVE' = 'UBER';
        const plataformaRaw = row['Plataforma'] || row['plataforma'] || '';
        const plataformaStr = String(plataformaRaw).toUpperCase().trim();

        if (plataformaStr === 'NOVE_NOVE' || plataformaStr === '99' || plataformaStr === 'NOVENOVE' || plataformaStr === 'NOVE NOVE') {
            plataforma = 'NOVE_NOVE';
        }

        const idCorrida = row['ID da Corrida'] || row['id_corrida'] || row['Trip ID'] || '';
        const idCorridaStr = String(idCorrida).replace('.0', '');

        const distanciaRaw = row['Distância (km)'] || row['distancia_km'] || row['Distance'] || 0;
        let distanciaKm = 0;
        let valorNumerico = this.parseFloatExato(distanciaRaw);

        if (plataforma === 'UBER') {
            distanciaKm = valorNumerico * 1.60934;
        } else {
            distanciaKm = valorNumerico;
        }

        let duracaoMin = 0;
        const duracaoRaw = row['Duração (min)'] || row['duracao_min'] || row['Duration'];
        if (duracaoRaw) {
            if (typeof duracaoRaw === 'string' && duracaoRaw.includes(':')) {
                const parts = duracaoRaw.split(':');
                duracaoMin = parseInt(parts[0]) * 60 + parseInt(parts[1]);
                if (parts.length > 2) duracaoMin += parseInt(parts[2]);
            } else {
                duracaoMin = Math.round(this.parseFloatExato(duracaoRaw));
            }
        }

        // 🔧 ADICIONAR R$1 PARA VIAGENS DA 99
        let valorTotal = this.parseFloatExato(row['Valor Total'] || row['valor_total'] || row['Amount']);

        if (plataforma === 'NOVE_NOVE') {
            valorTotal += 1; // Adiciona R$1
            console.log(`🟢 Adicionado R$1 à viagem 99: ${idCorridaStr} (valor original: ${this.parseFloatExato(row['Valor Total'] || 0)})`);
        }

        const rawPrograma = row['Programa'] || row['programa'] || row['Program'] || '';
        const programaNormalizado = this.normalizarNomePrograma(rawPrograma);

        return {
            idCorridaPlataforma: idCorridaStr,
            plataforma: plataforma,
            dataSolicitacao: this.parseDateValue(rawDataSolicitacao),
            horaSolicitacao: this.parseTimeValue(rawHoraSolicitacao),
            dataChegada: this.parseDateValue(rawDataChegada),
            horaChegada: this.parseTimeValue(rawHoraChegada),
            servico: row['Serviço'] || row['servico'] || row['Service'] || '',
            programa: programaNormalizado,
            grupo: row['Grupo'] || row['grupo'] || row['Group'] || '',
            nome: row['Nome'] || row['nome'] || row['First Name'] || '',
            sobrenome: row['Sobrenome'] || row['sobrenome'] || row['Last Name'] || '',
            nomeCompleto: row['Nome Completo'] || row['nome_completo'] || '',
            email: row['Email'] || row['email'] || row['E-mail'] || '',
            detalhamentoDespesa: row['Detalhamento da despesa'] || row['detalhamento_despesa'] || row['Expense Memo'] || '',
            valorTotal: valorTotal, // Já com o ajuste para 99
            distanciaKm: this.parseFloatExato(distanciaKm),
            duracaoMin: duracaoMin,
            enderecoPartida: row['Endereço Partida'] || row['endereco_partida'] || row['Pickup Address'] || '',
            enderecoDestino: row['Endereço Destino'] || row['endereco_destino'] || row['Drop-off Address'] || '',
            cidade: row['Cidade'] || row['cidade'] || row['City'] || '',
            pais: row['País'] || row['pais'] || row['Country'] || '',
            status: row['Status']?.toUpperCase() === 'CANCELADA' ? 'CANCELADA' : 'COMPLETA',
        };
    }
}