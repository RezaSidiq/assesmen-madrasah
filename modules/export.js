// modules/export.js - Export data ke Excel (CSV format)

const fs = require('fs');
const path = require('path');

// Export ke Excel (CSV format)
async function exportToExcel(data, mapel, kelas, type = 'mapel') {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        let filename = '';
        let headers = [];
        let rows = [];
        
        if (type === 'mapel') {
            filename = `export_nilai_${mapel}${kelas ? '_kelas_' + kelas : ''}_${timestamp}.csv`;
            headers = ['No', 'NISN', 'Nama Siswa', 'Kelas', 'Teori', 'Praktek', 'Sikap', 'Kehadiran', 'Nilai Akhir', 'Status'];
            
            rows = data.map((item, index) => [
                index + 1,
                item.nisn,
                item.nama,
                item.kelas,
                item.teori,
                item.praktek,
                item.sikap,
                item.kehadiran,
                item.nilaiAkhir !== null ? item.nilaiAkhir.toFixed(2) : '-',
                item.status === 'Lulus' ? 'Lulus' : (item.status === 'Remedial' ? 'Remedial' : 'Data Tidak Lengkap')
            ]);
        } else if (type === 'remedial') {
            filename = `export_remedial${kelas ? '_kelas_' + kelas : ''}${mapel ? '_' + mapel : ''}_${timestamp}.csv`;
            headers = ['No', 'NISN', 'Nama Siswa', 'Kelas', 'Mata Pelajaran', 'Nilai Akhir', 'Teori', 'Praktek', 'Sikap', 'Kehadiran'];
            
            rows = [];
            let no = 1;
            for (const item of data) {
                for (const rm of item.remedialMapel) {
                    rows.push([
                        no++,
                        item.siswa.nisn,
                        item.siswa.nama,
                        item.siswa.kelas,
                        rm.mapel,
                        rm.nilaiAkhir,
                        rm.teori,
                        rm.praktek,
                        rm.sikap,
                        rm.kehadiran
                    ]);
                }
            }
        }
        
        if (rows.length === 0) {
            console.log('⚠️  Tidak ada data untuk diexport');
            return null;
        }
        
        const csvContent = [headers.join(';'), ...rows.map(row => row.join(';'))].join('\n');
        const bom = '\uFEFF';
        fs.writeFileSync(filename, bom + csvContent, 'utf8');
        
        console.log(`\n📁 File Excel berhasil diexport: ${filename}`);
        console.log(`   Lokasi: ${path.resolve(filename)}`);
        console.log(`   Jumlah data: ${rows.length} baris`);
        return filename;
        
    } catch (error) {
        console.error(`❌ Gagal export ke Excel: ${error.message}`);
        return null;
    }
}

module.exports = { exportToExcel };
