let attendanceData = JSON.parse(localStorage.getItem('attendanceList')) || [];
let currentPage = 1;
const rowsPerPage = 5;
let currentSort = 'nama';
let currentSortOrder = 'asc'; // tambahan untuk urutan ascending/descending
let currentFilter = 'all';
let searchQuery = '';
let filterDate = '';

let deleteModal = null;
let editModal = null;

// Fungsi untuk inisialisasi modal (dipanggil setelah DOM siap)
function initModals() {
    setTimeout(function() {
        try {
            const deleteModalEl = document.getElementById('deleteModal');
            const editModalEl = document.getElementById('editModal');
            
            if (deleteModalEl && bootstrap && bootstrap.Modal) {
                deleteModal = new bootstrap.Modal(deleteModalEl, {
                    backdrop: true,
                    keyboard: true,
                    focus: true
                });
            }
            
            if (editModalEl && bootstrap && bootstrap.Modal) {
                editModal = new bootstrap.Modal(editModalEl, {
                    backdrop: true,
                    keyboard: true,
                    focus: true
                });
            }
        } catch (error) {
            console.warn('Modal initialization encountered an issue:', error);
        }
    }, 100);
}

function saveToLocalStorage() {
    localStorage.setItem('attendanceList', JSON.stringify(attendanceData));
    updateStats();
}

function updateStats() {
    const totalHadir = attendanceData.length;
    const today = new Date().toISOString().split('T')[0];
    const hadirHariIni = attendanceData.filter(item => item.tanggalAbsen === today).length;
    const persentase = totalHadir > 0 ? Math.round((hadirHariIni / totalHadir) * 100) : 0;
    const totalKaryawan = [...new Set(attendanceData.map(item => item.nama))].length;
    
    const totalHadirEl = document.getElementById('totalHadir');
    const totalHariIniEl = document.getElementById('totalHariIni');
    const persentaseEl = document.getElementById('persentaseKehadiran');
    const totalKaryawanEl = document.getElementById('totalKaryawan');
    
    if (totalHadirEl) totalHadirEl.innerText = totalHadir;
    if (totalHariIniEl) totalHariIniEl.innerText = hadirHariIni;
    if (persentaseEl) persentaseEl.innerText = `${persentase}%`;
    if (totalKaryawanEl) totalKaryawanEl.innerText = totalKaryawan;
}

// ========== PERBAIKAN LOGIKA SORTING ==========
function renderTable() {
    let filteredData = [...attendanceData];
    
    // Filter by Gender
    if (currentFilter !== 'all') {
        filteredData = filteredData.filter(item => item.jenisKelamin === currentFilter);
    }
    
    // Filter by Date
    if (filterDate) {
        filteredData = filteredData.filter(item => item.tanggalAbsen === filterDate);
    }
    
    // Filter by Search
    if (searchQuery) {
        filteredData = filteredData.filter(item => 
            item.nama.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }
    
    // ========== LOGIKA SORTING YANG DIPERBAIKI ==========
    filteredData.sort((a, b) => {
        let comparison = 0;
        
        if (currentSort === 'nama') {
            comparison = a.nama.localeCompare(b.nama);
        } 
        else if (currentSort === 'tanggal') {
            // Sorting by date properly
            const dateA = new Date(a.tanggalAbsen);
            const dateB = new Date(b.tanggalAbsen);
            comparison = dateA - dateB;
        } 
        else if (currentSort === 'jamMasuk') {
            comparison = a.jamMasuk.localeCompare(b.jamMasuk);
        }
        
        // Apply order (ascending/descending)
        return currentSortOrder === 'asc' ? comparison : -comparison;
    });
    
    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const paginatedData = filteredData.slice(start, end);
    
    const tbody = document.getElementById('attendanceTableBody');
    if (!tbody) return;
    
    if (paginatedData.length === 0) {
        tbody.innerHTML = `</tr><td colspan="9" class="text-center py-5">📭 Belum ada data absensi</td></tr>`;
        const paginationEl = document.getElementById('pagination');
        const paginationInfo = document.getElementById('paginationInfo');
        if (paginationEl) paginationEl.innerHTML = '';
        if (paginationInfo) paginationInfo.innerText = 'Tidak ada data';
        return;
    }
    
    let html = '';
    paginatedData.forEach((item, index) => {
        const nomor = start + index + 1;
        const status = item.jamMasuk <= '09:00' ? 'Tepat Waktu' : 'Terlambat';
        const statusClass = item.jamMasuk <= '09:00' ? 'status-present' : 'status-badge';
        
        html += `
            <tr>
                <td>${nomor}</td>
                <td><strong>${escapeHtml(item.nama)}</strong></td>
                <td>${escapeHtml(item.alamat.substring(0, 30))}${item.alamat.length > 30 ? '...' : ''}</td>
                <td><span class="badge bg-secondary">${item.jenisKelamin === 'Laki-laki' ? '♂️ Laki' : '♀️ Perempuan'}</span></td>
                <td>${item.tanggalAbsen}</td>
                <td><i class="fas fa-clock text-primary me-1"></i>${item.jamMasuk}</td>
                <td><i class="fas fa-clock text-danger me-1"></i>${item.jamKeluar}</td>
                <td><span class="${statusClass}">${status}</span></td>
                <td>
                    <button class="btn-edit" onclick="openEditModal(${item.id})"><i class="fas fa-edit"></i></button>
                    <button class="btn-delete" onclick="openDeleteModal(${item.id})"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
    renderPagination(totalPages, filteredData.length);
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function renderPagination(totalPages, totalData) {
    const paginationEl = document.getElementById('pagination');
    const paginationInfo = document.getElementById('paginationInfo');
    
    if (!paginationEl) return;
    
    const start = (currentPage - 1) * rowsPerPage + 1;
    const end = Math.min(currentPage * rowsPerPage, totalData);
    
    if (paginationInfo) {
        paginationInfo.innerText = totalData > 0 ? `Menampilkan ${start}-${end} dari ${totalData} data` : 'Tidak ada data';
    }
    
    if (totalPages <= 1) {
        paginationEl.innerHTML = '';
        return;
    }
    
    let pagesHtml = '';
    for (let i = 1; i <= totalPages; i++) {
        pagesHtml += `<li class="page-item ${i === currentPage ? 'active' : ''}">
                        <a class="page-link" href="#" onclick="changePage(${i}); return false;">${i}</a>
                      </li>`;
    }
    paginationEl.innerHTML = pagesHtml;
}

window.changePage = function(page) {
    currentPage = page;
    renderTable();
};

// FUNGSI DELETE DENGAN MODAL POPUP MODERN
window.openDeleteModal = function(id) {
    const deleteIdInput = document.getElementById('deleteId');
    if (deleteIdInput) {
        deleteIdInput.value = id;
    }
    if (deleteModal) {
        try {
            deleteModal.show();
        } catch (err) {
            console.error('Error showing delete modal:', err);
        }
    }
};

// FUNGSI EDIT MODAL
window.openEditModal = function(id) {
    const item = attendanceData.find(d => d.id === id);
    if (item && editModal) {
        document.getElementById('editId').value = item.id;
        document.getElementById('editNama').value = item.nama;
        document.getElementById('editAlamat').value = item.alamat;
        document.getElementById('editJk').value = item.jenisKelamin;
        document.getElementById('editTanggal').value = item.tanggalAbsen;
        document.getElementById('editJamMasuk').value = item.jamMasuk;
        document.getElementById('editJamKeluar').value = item.jamKeluar;
        try {
            editModal.show();
        } catch (err) {
            console.error('Error showing edit modal:', err);
        }
    }
};

function showToast(message, type = 'success') {
    let toastContainer = document.querySelector('.toast-container-custom');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'position-fixed bottom-0 end-0 p-3 toast-container-custom';
        toastContainer.style.zIndex = '9999';
        document.body.appendChild(toastContainer);
    }
    
    const bgColor = type === 'success' ? 'bg-success' : 'bg-danger';
    const icon = type === 'success' ? 'check-circle' : 'exclamation-circle';
    
    const toastEl = document.createElement('div');
    toastEl.className = `toast align-items-center text-white ${bgColor} border-0 show mb-2`;
    toastEl.setAttribute('role', 'alert');
    toastEl.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                <i class="fas fa-${icon} me-2"></i>${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    
    toastContainer.appendChild(toastEl);
    
    setTimeout(() => {
        toastEl.remove();
    }, 3000);
    
    const closeBtn = toastEl.querySelector('.btn-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            toastEl.remove();
        });
    }
}

function initDummyData() {
    if (attendanceData.length === 0) {
        const dummy = [
            { id: 1, nama: 'Ahmad Fathir', alamat: 'Jl. Merdeka No.10, Jakarta Selatan', jenisKelamin: 'Laki-laki', tanggalAbsen: '2024-03-20', jamMasuk: '08:00', jamKeluar: '17:00' },
            { id: 2, nama: 'Siti Nurhaliza', alamat: 'Jl. Sudirman No.5, Bandung', jenisKelamin: 'Perempuan', tanggalAbsen: '2024-03-20', jamMasuk: '08:30', jamKeluar: '17:30' },
            { id: 3, nama: 'Budi Santoso', alamat: 'Jl. Diponegoro No.12, Surabaya', jenisKelamin: 'Laki-laki', tanggalAbsen: '2024-03-21', jamMasuk: '07:45', jamKeluar: '16:45' },
            { id: 4, nama: 'Dewi Anggraini', alamat: 'Jl. Thamrin No.8, Medan', jenisKelamin: 'Perempuan', tanggalAbsen: '2024-03-21', jamMasuk: '09:15', jamKeluar: '18:00' },
            { id: 5, nama: 'Rizky Febrian', alamat: 'Jl. Pahlawan No.3, Semarang', jenisKelamin: 'Laki-laki', tanggalAbsen: '2024-03-22', jamMasuk: '08:20', jamKeluar: '17:15' }
        ];
        attendanceData.push(...dummy);
        saveToLocalStorage();
    }
}

// ========== EVENT LISTENERS ==========
document.addEventListener('DOMContentLoaded', function() {
    initModals();
    initDummyData();
    renderTable();
    
    // ========== SORTING EVENT dengan toggle ASC/DESC ==========
    const sortSelect = document.getElementById('sortBy');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            const selectedValue = e.target.value;
            
            // Jika pilihan sama, toggle urutan
            if (currentSort === selectedValue) {
                currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
            } else {
                currentSort = selectedValue;
                currentSortOrder = 'asc';
            }
            
            // Update tampilan option untuk menunjukkan urutan
            const optionText = {
                'nama': 'Nama',
                'tanggal': 'Tanggal',
                'jamMasuk': 'Jam Masuk'
            };
            
            const arrow = currentSortOrder === 'asc' ? '↑' : '↓';
            sortSelect.options[sortSelect.selectedIndex].text = `${optionText[selectedValue]} ${arrow}`;
            
            // Reset options lainnya
            for (let i = 0; i < sortSelect.options.length; i++) {
                if (sortSelect.options[i].value !== selectedValue) {
                    const optText = {
                        'nama': 'Sort by Nama',
                        'tanggal': 'Sort by Tanggal',
                        'jamMasuk': 'Sort by Jam Masuk'
                    };
                    sortSelect.options[i].text = optText[sortSelect.options[i].value];
                }
            }
            
            currentPage = 1;
            renderTable();
            showToast(`Data diurutkan berdasarkan ${optionText[selectedValue]} (${currentSortOrder === 'asc' ? 'A-Z / Terlama' : 'Z-A / Terbaru'})`, 'success');
        });
    }
    
    // Filter Gender event
    const filterGender = document.getElementById('filterGender');
    if (filterGender) {
        filterGender.addEventListener('change', (e) => {
            currentFilter = e.target.value;
            currentPage = 1;
            renderTable();
        });
    }
    
    // Search input event
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            currentPage = 1;
            renderTable();
        });
    }
    
    // Refresh button event
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            searchQuery = '';
            currentFilter = 'all';
            currentSort = 'nama';
            currentSortOrder = 'asc';
            filterDate = '';
            
            const filterGenderEl = document.getElementById('filterGender');
            const searchInputEl = document.getElementById('searchInput');
            const filterDateEl = document.getElementById('filterDate');
            const sortSelectEl = document.getElementById('sortBy');
            
            if (filterGenderEl) filterGenderEl.value = 'all';
            if (searchInputEl) searchInputEl.value = '';
            if (filterDateEl) filterDateEl.value = '';
            if (sortSelectEl) {
                sortSelectEl.value = 'nama';
                sortSelectEl.options[0].text = 'Sort by Nama';
                sortSelectEl.options[1].text = 'Sort by Tanggal';
                sortSelectEl.options[2].text = 'Sort by Jam Masuk';
            }
            
            renderTable();
            showToast('Data berhasil direfresh', 'success');
        });
    }
    
    // Date Filter event
    const filterDateEl = document.getElementById('filterDate');
    if (filterDateEl) {
        filterDateEl.addEventListener('change', (e) => {
            filterDate = e.target.value;
            currentPage = 1;
            renderTable();
        });
    }
    
    // Confirm Delete Button
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', () => {
            const id = parseInt(document.getElementById('deleteId').value);
            attendanceData = attendanceData.filter(item => item.id !== id);
            saveToLocalStorage();
            renderTable();
            if (deleteModal) {
                try {
                    deleteModal.hide();
                } catch (err) {
                    console.error('Error hiding delete modal:', err);
                }
            }
            showToast('Data berhasil dihapus', 'success');
        });
    }
    
    // Save Edit Button
    const saveEditBtn = document.getElementById('saveEditBtn');
    if (saveEditBtn) {
        saveEditBtn.addEventListener('click', () => {
            const id = parseInt(document.getElementById('editId').value);
            const index = attendanceData.findIndex(d => d.id === id);
            if (index !== -1) {
                attendanceData[index] = {
                    ...attendanceData[index],
                    nama: document.getElementById('editNama').value,
                    alamat: document.getElementById('editAlamat').value,
                    jenisKelamin: document.getElementById('editJk').value,
                    tanggalAbsen: document.getElementById('editTanggal').value,
                    jamMasuk: document.getElementById('editJamMasuk').value,
                    jamKeluar: document.getElementById('editJamKeluar').value
                };
                saveToLocalStorage();
                renderTable();
                if (editModal) {
                    try {
                        editModal.hide();
                    } catch (err) {
                        console.error('Error hiding edit modal:', err);
                    }
                }
                showToast('Data berhasil diperbarui', 'success');
            }
        });
    }
    
    // Form Submit untuk Add
    const formAbsensi = document.getElementById('attendanceForm');
    if (formAbsensi) {
        formAbsensi.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const nama = document.getElementById('nama')?.value;
            const alamat = document.getElementById('alamat')?.value;
            const jenisKelamin = document.getElementById('jenisKelamin')?.value;
            const tanggalAbsen = document.getElementById('tanggalAbsen')?.value;
            const jamMasuk = document.getElementById('jamMasuk')?.value;
            const jamKeluar = document.getElementById('jamKeluar')?.value;
            
            if (!nama || !alamat || !jenisKelamin || !tanggalAbsen || !jamMasuk || !jamKeluar) {
                showToast('Semua field harus diisi!', 'error');
                return;
            }
            
            const newId = Date.now();
            const newAttendance = {
                id: newId,
                nama: nama,
                alamat: alamat,
                jenisKelamin: jenisKelamin,
                tanggalAbsen: tanggalAbsen,
                jamMasuk: jamMasuk,
                jamKeluar: jamKeluar
            };
            
            attendanceData.push(newAttendance);
            saveToLocalStorage();
            showToast('Absensi berhasil disimpan!', 'success');
            formAbsensi.reset();
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        });
    }
});