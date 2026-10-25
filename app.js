// ========== CONFIGURACIÓN GLOBAL FIREBASE ==========
const firebaseConfig = {
    apiKey: "AIzaSyB3xTYP7wKgvFvySX8ZkHqm0Tly8y4LcM4",
    authDomain: "imprecioneswjs.firebaseapp.com",
    databaseURL: "https://imprecioneswjs-default-rtdb.firebaseio.com",
    projectId: "imprecioneswjs",
    storageBucket: "imprecioneswjs.appspot.com",
    appId: "1:923402098800:web:ef57d1e1bf1fdd758a3cb5"
};

let db;
let usuarioActual = null;
let clientes = [], deudas = [];
let prestamos = [], comisiones = [], cuadresCentral = [], cuadresPendientes = [], cuadresHistorial = [];
let gastos = [];
let diasLibres = [];
let nominas = [];
let empleados = [];
let loterias = [];
let historialFondos = [];

let bancas = {
    kiko1: { nombre: 'Banca Kiko 1', fondo: 5000 },
    kiko2: { nombre: 'Banca Kiko 2', fondo: 5000 },
    kiko3: { nombre: 'Banca Kiko 3', fondo: 5000 }
};

const DENOMINACIONES = [2000, 1000, 500, 200, 100, 50, 25, 10, 5, 1];

const DIAS_SEMANA = [
    { valor: 0, nombre: 'Domingo' },
    { valor: 1, nombre: 'Lunes' },
    { valor: 2, nombre: 'Martes' },
    { valor: 3, nombre: 'Miércoles' },
    { valor: 4, nombre: 'Jueves' },
    { valor: 5, nombre: 'Viernes' },
    { valor: 6, nombre: 'Sábado' }
];

const ICONOS_GASTO = {
    dienta: { icon: '🍽️', label: 'Dienta / Comida' },
    domingo: { icon: '⛪', label: 'Diente Domingo' },
    fiesta: { icon: '🎉', label: 'Día de Fiesta' },
    deposito: { icon: '🏦', label: 'Depósito Bancario' },
    limpieza: { icon: '🧽', label: 'Limpieza' },
    transporte: { icon: '🚕', label: 'Transporte' },
    papeleria: { icon: '📄', label: 'Papelería' },
    otro: { icon: '📌', label: 'Otro' }
};

window.baseSumablesFijos = 0;
window.estadoCuadreResultado = "FALTANTE";
window.montoDiferenciaCalculada = 0;
window.totalEfectivoCalculado = 0;
window.estoyEnCuadre = false;
window.recargasDiaManual = 0;

// ========== INICIALIZACIÓN FIREBASE ==========
if (typeof firebase !== 'undefined') {
    if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
    db = firebase.database();
} else {
    alert("CRÍTICO: Las librerías de Firebase no se cargaron en el HTML.");
}

// ============================================================
// ========== HELPER: NOMBRE DE BANCA COMPLETO ==========
// ============================================================
function getNombreBancaCompleto(bancaKey) {
    const empleada = empleados.find(e => e.banca === bancaKey);
    const nombreBase = bancas[bancaKey]?.nombre || `Banca ${bancaKey}`;
    if (empleada) {
        return `${empleada.nombre} · ${nombreBase}`;
    }
    return nombreBase;
}

// ============================================================
// ========== HELPER: CALCULAR COMISIÓN + RECARGAS ==========
// ============================================================
function calcularComisionYRecargas(bancaKey) {
    const comisionesNoRetiradas = comisiones.filter(c => c.banca === bancaKey && !c.retirado);
    
    const comisionesManuales = comisionesNoRetiradas.filter(c => !c.tipo || c.tipo === 'manual' || c.tipo === 'comision');
    const recargas = comisionesNoRetiradas.filter(c => c.tipo === 'recarga');
    const gastosNegativos = comisionesNoRetiradas.filter(c => c.tipo === 'gasto');
    const faltantes = comisionesNoRetiradas.filter(c => c.tipo === 'faltante_cuadre');
    
    const totalComisionesManuales = comisionesManuales.reduce((s,c) => s + (c.monto || 0), 0);
    const totalRecargas = recargas.reduce((s,c) => s + (c.monto || 0), 0);
    const totalGastos = gastosNegativos.reduce((s,c) => s + (c.monto || 0), 0);
    const totalFaltantes = faltantes.reduce((s,c) => s + (c.monto || 0), 0);
    
    const totalGlobal = totalComisionesManuales + totalRecargas + totalGastos + totalFaltantes;
    
    return {
        totalGlobal,
        totalComisionesManuales,
        totalRecargas,
        totalGastos,
        totalFaltantes
    };
}

// ============================================================
// ========== MENÚ LATERAL ==========
// ============================================================
window.toggleMenuLateral = function() {
    const menu = document.getElementById('menuLateral');
    const overlay = document.getElementById('menuOverlay');
    if (!menu || !overlay) return;
    menu.classList.toggle('abierto');
    overlay.classList.toggle('visible');
};

function cerrarMenuLateral() {
    const menu = document.getElementById('menuLateral');
    const overlay = document.getElementById('menuOverlay');
    if (menu) menu.classList.remove('abierto');
    if (overlay) overlay.classList.remove('visible');
}

function construirMenuLateral() {
    const items = document.getElementById('menuItems');
    const menuName = document.getElementById('menuUserName');
    const menuRole = document.getElementById('menuUserRole');

    if (!items || !usuarioActual) return;

    menuName.textContent = usuarioActual.nombre;
    menuRole.textContent = usuarioActual.rol === 'admin' ? 'Central Admin' : getNombreBancaCompleto(usuarioActual.banca);

    let html = '';

    if (usuarioActual.rol === 'admin') {
        html += `
            <button class="menu-item" onclick="menuIr(this, cargarPanelAdmin)"><i class="fa-solid fa-shield-halved"></i><span>Panel General</span></button>
            <button class="menu-item" onclick="menuIr(this, cargarClientesAdmin)"><i class="fa-solid fa-users"></i><span>Clientes</span></button>
            <button class="menu-item" onclick="menuIr(this, cargarGestionEmpleados)"><i class="fa-solid fa-user-plus"></i><span>Empleados</span></button>
            <button class="menu-item" onclick="menuIr(this, cargarNominaAdmin)"><i class="fa-solid fa-money-check-dollar"></i><span>Nómina</span></button>
            <button class="menu-item" onclick="menuIr(this, cargarGastosAdmin)"><i class="fa-solid fa-receipt"></i><span>Gastos</span></button>
            <button class="menu-item" onclick="menuIr(this, cargarDiasLibresAdmin)"><i class="fa-solid fa-calendar-days"></i><span>Días Libres</span></button>
            <button class="menu-item" onclick="menuIr(this, cargarFondosAdmin)"><i class="fa-solid fa-vault"></i><span>Fondos de Bancas</span></button>
            <button class="menu-item" onclick="menuIr(this, cargarAnguilla)"><i class="fa-solid fa-tower-broadcast"></i><span>Anguilla (Pizarra)</span></button>
            <button class="menu-item" onclick="menuIr(this, cargarResultadosNuevo)"><i class="fa-solid fa-chart-simple"></i><span>Resultados Loterías</span></button>
            <button class="menu-item" onclick="menuIr(this, cargarWebAdmin)"><i class="fa-solid fa-globe"></i><span>Control Página Web</span></button>
            <button class="menu-item" onclick="menuIr(this, abrirHistorialCuadresAdmin)"><i class="fa-solid fa-clock-rotate-left"></i><span>Historial</span></button>
        `;
    } else {
        html += `
            <button class="menu-item" onclick="menuIr(this, cargarPanelEmpleada)"><i class="fa-solid fa-house-user"></i><span>Inicio</span></button>
            <button class="menu-item" onclick="menuIr(this, cargarClientesEmpleada)"><i class="fa-solid fa-street-view"></i><span>Mis Clientes</span></button>
            <button class="menu-item" onclick="menuIr(this, cargarCalculadoraCuadre)"><i class="fa-solid fa-calculator"></i><span>Cuadrar Caja</span></button>
            <button class="menu-item" onclick="menuIr(this, cargarCentralEmpleada)"><i class="fa-solid fa-building-columns"></i><span>C. Central</span></button>
            <button class="menu-item" onclick="menuIr(this, cargarComisionEmpleada)"><i class="fa-solid fa-percent"></i><span>Registrar Comisión</span></button>
            <button class="menu-item" onclick="menuIr(this, cargarRecargasEmpleada)"><i class="fa-solid fa-mobile-screen-button"></i><span>Recargas y Servicios Ex.</span></button>
            <button class="menu-item" onclick="menuIr(this, cargarRegistroEmpleada)"><i class="fa-solid fa-pen-to-square"></i><span>Registrar Préstamos</span></button>
            <button class="menu-item" onclick="menuIr(this, cargarMiQuincena)"><i class="fa-solid fa-money-check-dollar"></i><span>Mi Quincena</span></button>
            <button class="menu-item" onclick="menuIr(this, cargarMisDiasLibres)"><i class="fa-solid fa-calendar-days"></i><span>Mis Días Libres</span></button>
            <button class="menu-item" onclick="menuIr(this, cargarWebAdmin)"><i class="fa-solid fa-globe"></i><span>Control Página Web</span></button>
            <button class="menu-item" onclick="menuIr(this, cargarResultadosNuevo)"><i class="fa-solid fa-chart-simple"></i><span>Resultados Loterías</span></button>
            <button class="menu-item" onclick="menuIr(this, cargarAnguilla)"><i class="fa-solid fa-tower-broadcast"></i><span>Pizarra Anguilla</span></button>
        `;
    }

    items.innerHTML = html;
    const primerBtn = items.querySelector('.menu-item');
    if (primerBtn) primerBtn.classList.add('active');
}

window.menuIr = function(btn, callback) {
    document.querySelectorAll('.menu-item').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    window.estoyEnCuadre = false;
    cerrarMenuLateral();
    callback();
};

// ============================================================
// ========== CARGA INICIAL DE DATOS ==========
// ============================================================
function cargarDatosIniciales() {
    if(!db) { alert('Error: Firebase no inicializó'); return; }
    try {
        db.ref('deudas').on('value', snap => { 
            deudas = snap.exists() ? Object.entries(snap.val()).map(([k,v]) => ({id:k, ...v})) : []; 
        });

        db.ref('fondos_bancas').on('value', snap => { 
            if(snap.exists()) bancas = snap.val(); 
            if (window.estoyEnCuadre) recalcularTotalesCuadreEnVivo();
        });

        db.ref('prestamos').on('value', snap => { 
            prestamos = snap.exists() ? Object.entries(snap.val()).map(([k,v]) => ({id:k, ...v})) : []; 
            if (window.estoyEnCuadre) recalcularTotalesCuadreEnVivo();
        });

        db.ref('comisiones').on('value', snap => { 
            comisiones = snap.exists() ? Object.entries(snap.val()).map(([k,v]) => ({id:k, ...v})) : []; 
            if (window.estoyEnCuadre) recalcularTotalesCuadreEnVivo();
        });

        db.ref('gastos').on('value', snap => { 
            gastos = snap.exists() ? Object.entries(snap.val()).map(([k,v]) => ({id:k, ...v})) : []; 
        });

        db.ref('cuadres_central').on('value', snap => { 
            cuadresCentral = snap.exists() ? Object.entries(snap.val()).map(([k,v]) => ({id:k, ...v})) : []; 
            if (window.estoyEnCuadre) recalcularTotalesCuadreEnVivo();
        });

        db.ref('cuadres_pendientes').on('value', snap => { 
            cuadresPendientes = snap.exists() ? Object.entries(snap.val()).map(([k,v]) => ({id:k, ...v})) : []; 
        });

        db.ref('cuadres_historial').on('value', snap => { 
            cuadresHistorial = snap.exists() ? Object.entries(snap.val()).map(([k,v]) => ({id:k, ...v})) : []; 
        });

        db.ref('dias_libres').on('value', snap => {
            diasLibres = snap.exists() ? Object.entries(snap.val()).map(([k,v]) => ({id:k, ...v})) : [];
        });

        db.ref('historial_fondos').on('value', snap => {
            historialFondos = snap.exists() ? Object.entries(snap.val()).map(([k,v]) => ({id:k, ...v})) : [];
        });

        db.ref('empleados').on('value', snap => { 
            empleados = snap.exists() ? Object.entries(snap.val()).map(([k,v]) => ({id:k, ...v})) : [];
            if (usuarioActual && usuarioActual.rol === 'admin') {
                const titulo = document.getElementById('pageTitle')?.textContent || '';
                if (titulo.includes('General') || titulo.includes('Admin')) cargarPanelAdmin();
            }
            if (usuarioActual && usuarioActual.rol === 'empleada') {
                const titulo = document.getElementById('pageTitle')?.textContent || '';
                if (titulo.includes('Quincena')) cargarMiQuincena();
            }
        });

        db.ref('loterias').on('value', snap => {
            loterias = snap.exists() ? Object.entries(snap.val()).map(([k,v]) => ({id:k, ...v})) : [];
        });

        db.ref('nominas').on('value', snap => {
            nominas = snap.exists() ? Object.entries(snap.val()).map(([k,v]) => ({id:k, ...v})) : [];
        });

        db.ref('clientes').on('value', snap => {
            clientes = snap.exists() ? Object.entries(snap.val()).map(([k,v]) => ({id:k, ...v})) : [];
            if (window.estoyEnCuadre) {
                recalcularTotalesCuadreEnVivo();
            } else if (usuarioActual) {
                refrescarPantallaActiva();
            }
        });

        document.getElementById('contentArea').innerHTML = `
            <div style="text-align:center; padding:70px 20px; color:var(--text-muted);">
                <i class="fa-solid fa-user-lock" style="font-size:48px; color:var(--primary); margin-bottom:14px;"></i>
                <p style="font-weight:700; color:var(--text-main);">Por favor Inicie Sesión</p>
                <p style="font-size:11px; margin-top:4px;">Cada empleada debe loguearse con sus datos.</p>
            </div>
        `;
        abrirModal('modalLogin');
    } catch(e) { console.error("Error al sincronizar: ", e); }
}

function refrescarPantallaActiva() {
    if (!usuarioActual) return;
    const titulo = document.getElementById('pageTitle')?.textContent || '';
    if (titulo.includes('General') || titulo.includes('Admin') || titulo.includes('Central')) cargarPanelAdmin();
    else if (titulo.includes('Principal') || titulo.includes('Banca') || titulo.includes('Inicio')) cargarPanelEmpleada();
    else if (titulo.includes('Clientes') || titulo.includes('Mis Clientes')) { if(usuarioActual.rol === 'admin') cargarClientesAdmin(); else cargarClientesEmpleada(); }
    else if (titulo.includes('Caja') || titulo.includes('Cuadre')) recalcularTotalesCuadreEnVivo();
    else if (titulo.includes('Empleados')) cargarGestionEmpleados();
    else if (titulo.includes('Quincena')) cargarMiQuincena();
    else if (titulo.includes('Nómina')) cargarNominaAdmin();
    else if (titulo.includes('Gastos')) cargarGastosAdmin();
    else if (titulo.includes('Días Libres')) { if (usuarioActual.rol === 'admin') cargarDiasLibresAdmin(); else cargarMisDiasLibres(); }
    else if (titulo.includes('Fondos')) cargarFondosAdmin();
    else if (titulo.includes('Recargas')) cargarRecargasEmpleada();
    else if (titulo.includes('Comisión')) cargarComisionEmpleada();
    else if (titulo.includes('Registrar')) cargarRegistroEmpleada();
    else if (titulo.includes('Central')) cargarCentralEmpleada();
    else if (titulo.includes('Resultado')) { if (!document.getElementById('iframeResultados')) cargarResultadosNuevo(); }
}

// ============================================================
// ========== LOGIN ==========
// ============================================================
window.switchLoginTab = function(tipo) {
    document.getElementById('btnTabEmpleado').classList.toggle('active', tipo === 'empleada');
    document.getElementById('btnTabAdmin').classList.toggle('active', tipo === 'admin');
    document.getElementById('loginEmpleadoForm').classList.toggle('hidden-pane', tipo !== 'empleada');
    document.getElementById('loginAdminForm').classList.toggle('hidden-pane', tipo !== 'admin');
};

window.iniciarSesionAdmin = function() {
    const pass = document.getElementById('loginAdminPassword').value;
    if (pass === 'admin123') {
        usuarioActual = { id: 'admin', nombre: 'Administrador Central', rol: 'admin', avatar: 'A' };
        concluirLogin(cargarPanelAdmin);
    } else { 
        alert('❌ Clave maestra inválida.\n\nClave por defecto: admin123'); 
    }
};

window.iniciarSesionEmpleado = function() {
    const u = document.getElementById('loginUsuario').value.trim().toLowerCase();
    const p = document.getElementById('loginPassword').value;
    
    if (!u || !p) return alert('⚠️ Complete usuario y contraseña.');
    if (empleados.length === 0) return alert('⚠️ No hay empleadas registradas.\n\nEntra como ADMIN (admin123) y crea una.');
    
    const empleadoEncontrado = empleados.find(emp => emp.usuario === u && emp.password === p);
    if (empleadoEncontrado) {
        usuarioActual = { 
            id: empleadoEncontrado.id, 
            nombre: empleadoEncontrado.nombre, 
            rol: 'empleada', 
            banca: empleadoEncontrado.banca, 
            avatar: empleadoEncontrado.avatar || empleadoEncontrado.nombre.charAt(0).toUpperCase(),
            sueldoBase: empleadoEncontrado.sueldoBase || 0
        };
        concluirLogin(cargarPanelEmpleada);
    } else {
        alert(`❌ Usuario o contraseña incorrectos.\n\nUsuarios: ${empleados.map(e => e.usuario).join(', ') || 'NINGUNO'}`);
    }
};

function concluirLogin(panelCallback) {
    try {
        const modalLogin = document.getElementById('modalLogin');
        if (modalLogin) {
            modalLogin.classList.add('hidden');
            modalLogin.style.display = 'none';
        }
        const avatarEl = document.getElementById('userAvatarHeader');
        if (avatarEl) avatarEl.textContent = usuarioActual.avatar;
        construirMenuLateral();
        panelCallback();
    } catch (e) {
        console.error('💥 Error en concluirLogin:', e);
        alert('Error al entrar: ' + e.message);
    }
}

window.cerrarSesion = function() {
    try {
        cerrarMenuLateral();
        usuarioActual = null;
        window.estoyEnCuadre = false;
        
        const avatarHeader = document.getElementById('userAvatarHeader');
        if (avatarHeader) avatarHeader.textContent = '?';
        const pageTitle = document.getElementById('pageTitle');
        if (pageTitle) pageTitle.textContent = 'Identificación...';
        
        const menuUserName = document.getElementById('menuUserName');
        if (menuUserName) menuUserName.textContent = 'Invitado';
        const menuUserRole = document.getElementById('menuUserRole');
        if (menuUserRole) menuUserRole.textContent = 'Sin sesión';
        const menuItems = document.getElementById('menuItems');
        if (menuItems) menuItems.innerHTML = '';
        
        const loginUser = document.getElementById('loginUsuario');
        const loginPass = document.getElementById('loginPassword');
        const loginAdmin = document.getElementById('loginAdminPassword');
        if (loginUser) loginUser.value = '';
        if (loginPass) loginPass.value = '';
        if (loginAdmin) loginAdmin.value = '';
        
        document.querySelectorAll('.mobile-modal').forEach(m => {
            m.classList.add('hidden');
            m.style.display = 'none';
        });
        
        cargarDatosIniciales();
    } catch (e) {
        console.error('Error al cerrar sesión:', e);
        location.reload();
    }
};

// ============================================================
// ========== C. CENTRAL (EMPLEADA) ==========
// ============================================================
window.cargarCentralEmpleada = function() {
    if (!usuarioActual) return;
    document.getElementById('pageTitle').textContent = 'C. Central';
    window.estoyEnCuadre = false;
    
    const bKey = usuarioActual.banca;
    const misCentral = cuadresCentral.filter(cc => cc.banca === bKey && !cc.retirado);
    const totalCentral = misCentral.reduce((s,cc) => s + cc.monto, 0);

    let html = `
        <div class="mobile-card" style="background: linear-gradient(135deg, #6b7280, #374151); color: white; border-bottom: 4px solid var(--dorado);">
            <label style="font-size:10px; font-weight:800; opacity:0.9; text-transform:uppercase;">🏢 C. Central Pendiente</label>
            <h2 style="font-size:26px; font-weight:900;">RD$ ${totalCentral.toFixed(2)}</h2>
            <p style="font-size:11px; opacity:0.9;">Registra y el admin recoge desde su panel</p>
        </div>

        <div class="mobile-card">
            <h3 style="font-size:14px; margin-bottom:12px; color:var(--azul-rey); font-weight:800;">➕ Registrar Cuadre Central</h3>
            <label class="input-sublabel">📅 Fecha y Hora</label>
            <input type="datetime-local" id="centralFecha" class="mobile-input" value="${new Date().toISOString().slice(0,16)}">
            <label class="input-sublabel">💰 Monto RD$</label>
            <input type="number" id="centralMonto" class="mobile-input" placeholder="Monto">
            <label class="input-sublabel">📝 Nota</label>
            <input type="text" id="centralNota" class="mobile-input" placeholder="Descripción">
            <button class="mobile-btn btn-primary-filled" onclick="guardarCentralEmpleada()">✅ Registrar</button>
        </div>

        <p style="font-weight:800; font-size:11px; margin:8px 0; color:var(--texto-gris); text-transform:uppercase;">📋 Mis Registros de C. Central</p>
    `;

    if (misCentral.length === 0) {
        html += '<p style="text-align:center; padding:20px; color:var(--text-muted);">Sin registros pendientes.</p>';
    } else {
        misCentral.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).forEach((c, i) => {
            html += `
                <div class="mobile-card">
                    <div class="card-top">
                        <span class="card-title"><span class="card-index">#${i+1}</span>🏢 C. Central</span>
                        <span class="mobile-badge badge-info">RD$ ${c.monto.toFixed(2)}</span>
                    </div>
                    <p style="font-size:11px; color:var(--text-muted); margin-top:4px;">
                        ${c.nota || ''}<br>
                        📅 ${c.fecha} · ${c.hora || ''}
                    </p>
                    <div class="card-actions">
                        <button class="mini-btn mini-btn-danger" onclick="eliminarCentralEmpleada('${c.id}')"><i class="fa-solid fa-trash"></i> Eliminar</button>
                    </div>
                </div>
            `;
        });
    }
    document.getElementById('contentArea').innerHTML = html;
};

window.guardarCentralEmpleada = async function() {
    if (!usuarioActual) return;
    const fechaStr = document.getElementById('centralFecha').value;
    const monto = parseFloat(document.getElementById('centralMonto').value) || 0;
    const nota = document.getElementById('centralNota').value.trim();
    if (monto <= 0) return alert('Ingrese un monto válido');
    const fecha = fechaStr ? new Date(fechaStr) : new Date();
    await db.ref('cuadres_central').push({
        banca: usuarioActual.banca,
        monto, nota,
        retirado: false,
        fecha: fecha.toLocaleDateString('es-DO'),
        hora: fecha.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' }),
        timestamp: fecha.toISOString(),
        registradoPor: usuarioActual.id,
        registradoPorNombre: usuarioActual.nombre
    });
    alert(`✅ C. Central registrado: RD$ ${monto}`);
    cargarCentralEmpleada();
};

window.eliminarCentralEmpleada = async function(id) {
    if (!confirm('¿Eliminar este registro?')) return;
    await db.ref(`cuadres_central/${id}`).remove();
    alert('Eliminado');
    cargarCentralEmpleada();
};

// ============================================================
// ========== COMISIÓN (EMPLEADA) - SIMPLE ==========
// ============================================================
window.cargarComisionEmpleada = function() {
    if (!usuarioActual) return;
    document.getElementById('pageTitle').textContent = 'Registrar Comisión';
    window.estoyEnCuadre = false;
    const bKey = usuarioActual.banca;
    
    const comisionesBanca = comisiones.filter(c => c.banca === bKey && (c.tipo === 'comision' || !c.tipo || c.tipo === 'manual'));
    const comPendientes = comisionesBanca.filter(c => !c.retirado);
    const totalComision = comPendientes.reduce((s,c) => s + c.monto, 0);

    let html = `
        <div class="mobile-card" style="background: linear-gradient(135deg, var(--success), #047857); color: white; border-bottom: 4px solid var(--dorado);">
            <label style="font-size:10px; font-weight:800; opacity:0.9; text-transform:uppercase;">💵 Comisión Pendiente</label>
            <h2 style="font-size:26px; font-weight:900;">RD$ ${totalComision.toFixed(2)}</h2>
            <p style="font-size:11px; opacity:0.9;">Se acumula hasta que el admin la retire</p>
        </div>

        <div class="mobile-card">
            <h3 style="font-size:14px; margin-bottom:12px; color:var(--azul-rey); font-weight:800;">➕ Registrar Comisión</h3>
            <label class="input-sublabel">📅 Fecha y Hora</label>
            <input type="datetime-local" id="comisionFecha" class="mobile-input" value="${new Date().toISOString().slice(0,16)}">
            <label class="input-sublabel">💰 Monto RD$</label>
            <input type="number" id="comisionMonto" class="mobile-input" placeholder="Monto">
            <button class="mobile-btn btn-success-filled" onclick="guardarComisionEmpleada()">✅ Registrar Comisión</button>
            <p style="font-size:10px; color:var(--text-muted); text-align:center; margin-top:6px;">
                💡 Se suma al desglose de "Comisión y Recargas" del cuadre.
            </p>
        </div>

        <p style="font-weight:800; font-size:11px; margin:8px 0; color:var(--texto-gris); text-transform:uppercase;">📋 Mis Comisiones Recientes (${comisionesBanca.length})</p>
    `;

    if (comisionesBanca.length === 0) {
        html += '<p style="text-align:center; padding:20px; color:var(--text-muted);">Sin registros aún.</p>';
    } else {
        comisionesBanca.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).forEach((c, i) => {
            const estado = c.retirado ? 'COBRADA' : 'PENDIENTE';
            const estadoClass = c.retirado ? 'badge-info' : 'badge-success';
            html += `
                <div class="mobile-card" style="${c.retirado ? 'opacity:0.7;' : ''}">
                    <div class="card-top">
                        <span class="card-title"><span class="card-index">#${i+1}</span>💵 Comisión</span>
                        <span class="mobile-badge ${estadoClass}">${estado}</span>
                    </div>
                    <p style="font-size:11px; color:var(--text-muted); margin-top:4px;">
                        <b>RD$ ${c.monto.toFixed(2)}</b><br>
                        📅 ${c.fecha} · ${c.hora || ''}
                    </p>
                    <div class="card-actions">
                        ${!c.retirado ? `<button class="mini-btn mini-btn-danger" onclick="eliminarComisionEmpleada('${c.id}')"><i class="fa-solid fa-trash"></i> Eliminar</button>` : ''}
                    </div>
                </div>
            `;
        });
    }
    document.getElementById('contentArea').innerHTML = html;
};

window.guardarComisionEmpleada = async function() {
    if (!usuarioActual) return;
    const fechaStr = document.getElementById('comisionFecha').value;
    const monto = parseFloat(document.getElementById('comisionMonto').value) || 0;
    if (monto <= 0) return alert('Ingrese un monto válido');
    const fecha = fechaStr ? new Date(fechaStr) : new Date();
    
    await db.ref('comisiones').push({
        banca: usuarioActual.banca,
        monto: monto,
        tipo: 'comision',
        nota: 'Comisión registrada por empleada',
        retirado: false,
        fecha: fecha.toLocaleDateString('es-DO'),
        hora: fecha.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' }),
        timestamp: fecha.toISOString(),
        registradoPor: usuarioActual.id,
        registradoPorNombre: usuarioActual.nombre
    });
    
    alert(`✅ Comisión registrada: RD$ ${monto}`);
    cargarComisionEmpleada();
};

window.eliminarComisionEmpleada = async function(id) {
    if (!confirm('¿Eliminar este registro de comisión?')) return;
    await db.ref(`comisiones/${id}`).remove();
    alert('Eliminado');
    cargarComisionEmpleada();
};

// ============================================================
// ========== RECARGAS Y SERVICIOS (EMPLEADA) - SOLO FECHA Y MONTO ==========
// ============================================================
window.cargarRecargasEmpleada = function() {
    if (!usuarioActual) return;
    document.getElementById('pageTitle').textContent = 'Recargas y Servicios Ex.';
    window.estoyEnCuadre = false;
    const bKey = usuarioActual.banca;
    
    const recargasBanca = comisiones.filter(c => c.banca === bKey && c.tipo === 'recarga');
    const recargasPendientes = recargasBanca.filter(r => !r.retirado);
    const totalRecargas = recargasPendientes.reduce((s,r) => s + r.monto, 0);

    let html = `
        <div class="mobile-card" style="background: linear-gradient(135deg, #0891b2, #0e7490); color: white; border-bottom: 4px solid var(--dorado);">
            <label style="font-size:10px; font-weight:800; opacity:0.9; text-transform:uppercase;">📱 Recargas Ex. Pendientes</label>
            <h2 style="font-size:26px; font-weight:900;">RD$ ${totalRecargas.toFixed(2)}</h2>
            <p style="font-size:11px; opacity:0.9;">Se suman a la comisión y al cuadre</p>
        </div>

        <div class="mobile-card">
            <h3 style="font-size:14px; margin-bottom:12px; color:var(--azul-rey); font-weight:800;">➕ Registrar Recarga / Servicio</h3>
            <label class="input-sublabel">📅 Fecha y Hora</label>
            <input type="datetime-local" id="recargaFecha" class="mobile-input" value="${new Date().toISOString().slice(0,16)}">
            <label class="input-sublabel">💰 Monto RD$</label>
            <input type="number" id="recargaMonto" class="mobile-input" placeholder="Monto">
            <button class="mobile-btn btn-primary-filled" onclick="guardarRecargaServicio()">✅ Registrar</button>
            <p style="font-size:10px; color:var(--text-muted); text-align:center; margin-top:6px;">
                💡 Se suma a la comisión y aparece en el cuadre como "Recargas Ex."
            </p>
        </div>

        <p style="font-weight:800; font-size:11px; margin:8px 0; color:var(--texto-gris); text-transform:uppercase;">📋 Mis Recargas Recientes (${recargasBanca.length})</p>
    `;

    if (recargasBanca.length === 0) {
        html += '<p style="text-align:center; padding:20px; color:var(--text-muted);">Sin registros aún.</p>';
    } else {
        recargasBanca.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).forEach((r, i) => {
            const estado = r.retirado ? 'COBRADO' : 'PENDIENTE';
            const estadoClass = r.retirado ? 'badge-info' : 'badge-success';
            html += `
                <div class="mobile-card" style="${r.retirado ? 'opacity:0.7;' : ''}">
                    <div class="card-top">
                        <span class="card-title"><span class="card-index">#${i+1}</span>📱 Recarga Ex.</span>
                        <span class="mobile-badge ${estadoClass}">${estado}</span>
                    </div>
                    <p style="font-size:11px; color:var(--text-muted); margin-top:4px;">
                        <b>RD$ ${r.monto.toFixed(2)}</b><br>
                        📅 ${r.fecha} · ${r.hora || ''}
                    </p>
                    <div class="card-actions">
                        ${!r.retirado ? `<button class="mini-btn mini-btn-danger" onclick="eliminarRecargaServicio('${r.id}')"><i class="fa-solid fa-trash"></i> Eliminar</button>` : ''}
                    </div>
                </div>
            `;
        });
    }
    document.getElementById('contentArea').innerHTML = html;
};

window.guardarRecargaServicio = async function() {
    if (!usuarioActual) return;
    const fechaStr = document.getElementById('recargaFecha').value;
    const monto = parseFloat(document.getElementById('recargaMonto').value) || 0;
    if (monto <= 0) return alert('Ingrese un monto válido');
    const fecha = fechaStr ? new Date(fechaStr) : new Date();
    
    await db.ref('comisiones').push({
        banca: usuarioActual.banca,
        monto: monto,
        tipo: 'recarga',
        nota: 'Recarga / Servicio Ex.',
        retirado: false,
        fecha: fecha.toLocaleDateString('es-DO'),
        hora: fecha.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' }),
        timestamp: fecha.toISOString(),
        registradoPor: usuarioActual.id,
        registradoPorNombre: usuarioActual.nombre
    });
    
    alert(`✅ Recarga registrada: RD$ ${monto}\n\nSe sumó a la comisión.`);
    cargarRecargasEmpleada();
};

window.eliminarRecargaServicio = async function(id) {
    if (!confirm('¿Eliminar este movimiento?')) return;
    await db.ref(`comisiones/${id}`).remove();
    alert('Eliminado');
    cargarRecargasEmpleada();
};

// ============================================================
// ========== PÁGINA WEB ==========
// ============================================================
window.cargarWebAdmin = function() {
    if (!usuarioActual) return;
    document.getElementById('pageTitle').textContent = 'Control Página Web';
    window.estoyEnCuadre = false;
    document.getElementById('contentArea').innerHTML = `
        <div style="margin: -12px; padding: 0; height: calc(100vh - 68px - 60px); overflow: hidden;">
            <iframe src="admin2.html" style="width: 100%; height: 100%; border: none; display: block;" allow="clipboard-write; fullscreen"></iframe>
        </div>
    `;
};

// ============================================================
// ========== ANGUILLA ==========
// ============================================================
window.cargarAnguilla = function() {
    if (!usuarioActual) return;
    document.getElementById('pageTitle').textContent = 'Pizarra Anguilla';
    window.estoyEnCuadre = false;
    document.getElementById('contentArea').innerHTML = `
        <div class="mobile-card" style="background: linear-gradient(135deg, var(--azul-rey), var(--azul-oscuro)); color: white; padding: 20px; margin-bottom: 14px; border-bottom: 4px solid var(--dorado);">
            <div style="display: flex; align-items: center; gap: 12px;">
                <div style="background: rgba(255,255,255,0.2); width: 52px; height: 52px; border-radius: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <i class="fa-solid fa-tower-broadcast" style="font-size: 24px; color: var(--dorado);"></i>
                </div>
                <div>
                    <h2 style="font-size: 18px; font-weight: 900; margin-bottom: 2px;">PIZARRA ANGUILLA</h2>
                    <p style="font-size: 11px; opacity: 0.9;">Control de sorteos y anuncios</p>
                </div>
            </div>
        </div>
        <p style="font-weight:800; font-size:11px; color:var(--text-muted); margin:8px 4px; text-transform:uppercase;">🎯 Opciones Disponibles</p>
        <button class="mobile-card anguilla-menu-btn" onclick="abrirSubmenuAnguilla('resultados')">
            <div style="background: linear-gradient(135deg, var(--naranja), #e06a00); width:52px; height:52px; border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <i class="fa-solid fa-trophy" style="font-size:22px; color:#fff;"></i>
            </div>
            <div style="flex:1;">
                <h3 style="font-size:14px; font-weight:800; color:var(--text-main); margin-bottom:3px;">Colocar Resultados</h3>
                <p style="font-size:11px; color:var(--text-muted); line-height:1.3;">Ingresar números ganadores del día</p>
            </div>
            <i class="fa-solid fa-chevron-right" style="color:var(--text-muted); font-size:14px;"></i>
        </button>
        <button class="mobile-card anguilla-menu-btn" onclick="abrirSubmenuAnguilla('anuncios')">
            <div style="background: linear-gradient(135deg, #3b82f6, #2563eb); width:52px; height:52px; border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <i class="fa-solid fa-bullhorn" style="font-size:22px; color:#fff;"></i>
            </div>
            <div style="flex:1;">
                <h3 style="font-size:14px; font-weight:800; color:var(--text-main); margin-bottom:3px;">Cargar Anuncios</h3>
                <p style="font-size:11px; color:var(--text-muted); line-height:1.3;">Administrar anuncios de la pizarra</p>
            </div>
            <i class="fa-solid fa-chevron-right" style="color:var(--text-muted); font-size:14px;"></i>
        </button>
    `;
};

window.abrirSubmenuAnguilla = function(tipo) {
    document.getElementById('pageTitle').textContent = tipo === 'resultados' ? 'Colocar Resultados' : 'Cargar Anuncios';
    document.getElementById('contentArea').innerHTML = `
        <div style="margin: -12px; padding: 0; height: calc(100vh - 68px - 60px); overflow: hidden;">
            <iframe src="pizarra_admin.html?view=${tipo}" style="width: 100%; height: 100%; border: none; display: block;" id="iframePizarra"></iframe>
        </div>
    `;
};

// ============================================================
// ========== RESULTADOS ==========
// ============================================================
window.cargarResultadosNuevo = function() {
    if (!usuarioActual) return;
    document.getElementById('pageTitle').textContent = 'Resultados de Loterías';
    window.estoyEnCuadre = false;
    document.getElementById('contentArea').innerHTML = `
        <div style="margin: -12px; padding: 0; height: calc(100vh - 68px - 60px); overflow: hidden;">
            <iframe src="resultado.html" style="width: 100%; height: 100%; border: none; display: block;" allow="clipboard-write" id="iframeResultados"></iframe>
        </div>
    `;
};

// ============================================================
// ========== EMPLEADOS ==========
// ============================================================
window.cargarGestionEmpleados = function() {
    document.getElementById('pageTitle').textContent = 'Gestión de Empleados';
    window.estoyEnCuadre = false;
    let html = `
        <div class="mobile-card">
            <h3 style="font-size:14px; margin-bottom:12px; color:var(--azul-rey); font-weight:800;">➕ Registrar Nueva Empleada</h3>
            <input type="text" id="nuevoEmpleadoNombre" class="mobile-input" placeholder="Nombre completo">
            <input type="text" id="nuevoEmpleadoUsuario" class="mobile-input" placeholder="Usuario (ej: maria1)">
            <input type="password" id="nuevoEmpleadoPassword" class="mobile-input" placeholder="Contraseña">
            <input type="number" id="nuevoEmpleadoSueldo" class="mobile-input" placeholder="Sueldo base quincenal RD$">
            <select id="nuevoEmpleadoBanca" class="mobile-input">
                <option value="kiko1">Banca Kiko 1</option>
                <option value="kiko2">Banca Kiko 2</option>
                <option value="kiko3">Banca Kiko 3</option>
            </select>
            <label class="input-sublabel">📅 Día Libre Fijo (opcional)</label>
            <select id="nuevoEmpleadoDiaLibre" class="mobile-input">
                <option value="-1">No aplica / No lleva</option>
                ${DIAS_SEMANA.map(d => `<option value="${d.valor}">${d.nombre}</option>`).join('')}
            </select>
            <button class="mobile-btn btn-primary-filled" onclick="registrarEmpleado()">📝 Registrar Empleada</button>
        </div>
        <p style="font-weight:800; font-size:11px; margin:8px 0; color:var(--texto-gris); text-transform:uppercase;">👥 Empleadas Registradas</p>
    `;
    
    if(empleados.length === 0) {
        html += '<p style="text-align:center; padding:20px; color:var(--text-muted);">No hay empleadas registradas.</p>';
    } else {
        empleados.forEach((emp, i) => {
            const diaLibreTexto = (emp.diaLibre === -1 || emp.diaLibre === undefined || emp.diaLibre === null) 
                ? '🚫 No lleva' 
                : `📅 ${DIAS_SEMANA[emp.diaLibre]?.nombre || '?'}`;
            const nombreBanca = bancas[emp.banca]?.nombre || emp.banca;
            html += `
                <div class="mobile-card">
                    <div class="card-top">
                        <span class="card-title"><span class="card-index">#${i+1}</span>${emp.nombre}</span>
                        <span class="mobile-badge badge-info">${nombreBanca}</span>
                    </div>
                    <div class="card-row-data" style="grid-template-columns: repeat(2, 1fr);">
                        <div class="data-cell"><label>Usuario</label><p>${emp.usuario}</p></div>
                        <div class="data-cell"><label>Sueldo Base</label><p>RD$ ${(emp.sueldoBase||0).toFixed(2)}</p></div>
                    </div>
                    <div class="summary-box" style="background:#ede9fe; color:#6d28d9; font-size:11px; padding:6px 10px;">
                        ${diaLibreTexto}
                    </div>
                    <div class="card-actions">
                        <button class="mini-btn mini-btn-info" onclick="abrirModalEditarEmpleado('${emp.id}')"><i class="fa-solid fa-pen"></i> Editar</button>
                        <button class="mini-btn mini-btn-warning" onclick="resetearPasswordEmpleado('${emp.id}')"><i class="fa-solid fa-key"></i> Pass</button>
                        <button class="mini-btn mini-btn-danger" onclick="eliminarEmpleado('${emp.id}')"><i class="fa-solid fa-trash"></i> Eliminar</button>
                    </div>
                </div>
            `;
        });
    }
    document.getElementById('contentArea').innerHTML = html;
};

window.registrarEmpleado = async function() {
    const nombre = document.getElementById('nuevoEmpleadoNombre').value.trim();
    const usuario = document.getElementById('nuevoEmpleadoUsuario').value.trim().toLowerCase();
    const password = document.getElementById('nuevoEmpleadoPassword').value;
    const sueldoBase = parseFloat(document.getElementById('nuevoEmpleadoSueldo').value) || 0;
    const banca = document.getElementById('nuevoEmpleadoBanca').value;
    const diaLibre = parseInt(document.getElementById('nuevoEmpleadoDiaLibre').value);
    if(!nombre || !usuario || !password) return alert('Complete todos los campos');
    if(empleados.some(emp => emp.usuario === usuario)) return alert('Este usuario ya está registrado');
    const nuevoEmpleado = {
        nombre, usuario, password, banca, sueldoBase, diaLibre,
        avatar: nombre.charAt(0).toUpperCase(),
        fechaRegistro: new Date().toISOString(),
        activo: true
    };
    await db.ref('empleados').push(nuevoEmpleado);
    alert('✅ Empleada registrada exitosamente');
    cargarGestionEmpleados();
};

window.abrirModalEditarEmpleado = function(id) {
    const emp = empleados.find(e => e.id === id);
    if (!emp) return;
    const nombre = prompt('Nombre completo:', emp.nombre);
    if (nombre === null) return;
    const usuario = prompt('Usuario:', emp.usuario);
    if (usuario === null) return;
    const password = prompt('Contraseña:', emp.password || '');
    if (password === null) return;
    const sueldoBase = prompt('Sueldo base quincenal RD$:', emp.sueldoBase || 0);
    if (sueldoBase === null) return;
    const banca = prompt('Banca (kiko1, kiko2, kiko3):', emp.banca);
    if (banca === null) return;
    const diaLibreStr = prompt('Día libre fijo (0=Dom, 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb, -1=No lleva):', emp.diaLibre ?? -1);
    if (diaLibreStr === null) return;
    
    db.ref(`empleados/${id}`).update({
        nombre: nombre.trim(),
        usuario: usuario.trim().toLowerCase(),
        password: password,
        sueldoBase: parseFloat(sueldoBase) || 0,
        banca: banca.trim(),
        diaLibre: parseInt(diaLibreStr)
    }).then(() => {
        alert('✅ Empleada actualizada');
        cargarGestionEmpleados();
    });
};

window.eliminarEmpleado = async function(id) {
    const emp = empleados.find(e => e.id === id);
    if(!emp) return;
    if(!confirm(`¿Eliminar a "${emp.nombre}"?`)) return;
    await db.ref(`empleados/${id}`).remove();
    alert('✅ Empleada eliminada');
    cargarGestionEmpleados();
};

window.resetearPasswordEmpleado = async function(id) {
    const nuevaPass = prompt('Ingrese la nueva contraseña:');
    if(nuevaPass && nuevaPass.length > 0) {
        await db.ref(`empleados/${id}`).update({ password: nuevaPass });
        alert('✅ Contraseña actualizada');
        cargarGestionEmpleados();
    }
};

// ============================================================
// ========== FONDOS DE BANCAS ==========
// ============================================================
window.cargarFondosAdmin = function() {
    document.getElementById('pageTitle').textContent = 'Fondos de Bancas';
    window.estoyEnCuadre = false;

    const todasLasBancas = ['kiko1', 'kiko2', 'kiko3'];
    let html = '';

    todasLasBancas.forEach((key, idx) => {
        const b = bancas[key] || { nombre: `Banca Kiko ${idx+1}`, fondo: 0 };
        const nombreBancaCompleto = getNombreBancaCompleto(key);
        const historialBanca = historialFondos.filter(h => h.banca === key).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 20);
        const entradas = historialBanca.filter(h => h.tipo === 'entrada').reduce((s,h) => s + h.monto, 0);
        const salidas = historialBanca.filter(h => h.tipo === 'salida').reduce((s,h) => s + h.monto, 0);

        html += `
            <div class="mobile-card fondo-card">
                <div class="card-top">
                    <span class="card-title"><span class="card-index">#${idx+1}</span>${nombreBancaCompleto}</span>
                    <span class="mobile-badge badge-success">RD$ ${(b.fondo || 0).toFixed(2)}</span>
                </div>
                <div class="mobile-grid-stats" style="grid-template-columns: repeat(2, 1fr); margin-top:8px;">
                    <div class="stat-box-app" style="padding:8px;"><h4>Entradas</h4><p style="color:var(--success); font-size:13px;">+RD$ ${entradas.toFixed(2)}</p></div>
                    <div class="stat-box-app" style="padding:8px;"><h4>Salidas</h4><p style="color:var(--danger); font-size:13px;">-RD$ ${salidas.toFixed(2)}</p></div>
                </div>
                <div class="card-actions" style="margin-top:10px;">
                    <button class="mini-btn mini-btn-info" onclick="editarFondoBanca('${key}', '${nombreBancaCompleto}', ${b.fondo || 0})"><i class="fa-solid fa-pen"></i> Editar Fondo</button>
                </div>
                <p style="font-weight:800; font-size:10px; color:var(--texto-gris); margin:12px 0 4px; text-transform:uppercase;">📋 Historial Reciente</p>
                ${historialBanca.length === 0 
                    ? '<p style="font-size:11px; color:var(--text-muted); text-align:center; padding:6px;">Sin movimientos.</p>'
                    : historialBanca.slice(0, 5).map(h => `
                        <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px; padding:6px 0; border-bottom:1px solid #f1f5f9; gap:6px;">
                            <div style="flex:1;">
                                <b style="color:${h.tipo === 'entrada' ? 'var(--success)' : 'var(--danger)'}">${h.tipo === 'entrada' ? '➕' : '➖'} RD$ ${h.monto.toFixed(2)}</b><br>
                                <span style="color:var(--text-muted); font-size:10px;">${h.concepto || ''} · ${h.fecha}</span>
                            </div>
                            <button class="mini-btn mini-btn-danger" style="flex:0; min-width:36px; padding:4px 6px;" onclick="eliminarMovimientoFondo('${h.id}')"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    `).join('')
                }
            </div>
        `;
    });
    document.getElementById('contentArea').innerHTML = html;
};

window.editarFondoBanca = async function(bancaKey, bancaNombre, fondoActual) {
    const opcion = prompt(`💰 EDITAR FONDO: ${bancaNombre}\n\nFondo actual: RD$ ${fondoActual}\n\n¿Qué deseas hacer?\n\n1 = Agregar entrada (sumar)\n2 = Retirar (restar)\n3 = Establecer nuevo valor exacto`, "1");
    if (!opcion) return;
    const num = parseInt(opcion);
    if (num === 1) {
        const monto = parseFloat(prompt('Monto a AGREGAR (RD$):'));
        if (isNaN(monto) || monto <= 0) return alert('Monto inválido');
        const concepto = prompt('Concepto (ej: Depósito, Aporte, etc.):', 'Entrada manual');
        if (concepto === null) return;
        const nuevoFondo = fondoActual + monto;
        await db.ref(`fondos_bancas/${bancaKey}`).update({ fondo: nuevoFondo, nombre: bancaNombre });
        await db.ref('historial_fondos').push({
            banca: bancaKey, tipo: 'entrada', monto, concepto,
            fondoAnterior: fondoActual, fondoNuevo: nuevoFondo,
            fecha: new Date().toLocaleDateString('es-DO'),
            hora: new Date().toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' }),
            timestamp: new Date().toISOString(),
            registradoPor: usuarioActual?.nombre || 'Admin'
        });
        alert(`✅ Fondo actualizado: RD$ ${nuevoFondo}`);
    } else if (num === 2) {
        const monto = parseFloat(prompt('Monto a RETIRAR (RD$):'));
        if (isNaN(monto) || monto <= 0) return alert('Monto inválido');
        if (monto > fondoActual) return alert(`⚠️ No puedes retirar más de RD$ ${fondoActual}`);
        const concepto = prompt('Concepto:', 'Retiro manual');
        if (concepto === null) return;
        const nuevoFondo = fondoActual - monto;
        await db.ref(`fondos_bancas/${bancaKey}`).update({ fondo: nuevoFondo });
        await db.ref('historial_fondos').push({
            banca: bancaKey, tipo: 'salida', monto, concepto,
            fondoAnterior: fondoActual, fondoNuevo: nuevoFondo,
            fecha: new Date().toLocaleDateString('es-DO'),
            hora: new Date().toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' }),
            timestamp: new Date().toISOString(),
            registradoPor: usuarioActual?.nombre || 'Admin'
        });
        alert(`✅ Fondo actualizado: RD$ ${nuevoFondo}`);
    } else if (num === 3) {
        const nuevoFondo = parseFloat(prompt('Nuevo valor del fondo (RD$):', fondoActual));
        if (isNaN(nuevoFondo) || nuevoFondo < 0) return alert('Valor inválido');
        const diferencia = nuevoFondo - fondoActual;
        const concepto = prompt('Motivo del ajuste:', 'Ajuste manual');
        if (concepto === null) return;
        await db.ref(`fondos_bancas/${bancaKey}`).update({ fondo: nuevoFondo });
        if (diferencia !== 0) {
            await db.ref('historial_fondos').push({
                banca: bancaKey,
                tipo: diferencia > 0 ? 'entrada' : 'salida',
                monto: Math.abs(diferencia),
                concepto: `Ajuste: ${concepto}`,
                fondoAnterior: fondoActual,
                fondoNuevo: nuevoFondo,
                fecha: new Date().toLocaleDateString('es-DO'),
                hora: new Date().toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' }),
                timestamp: new Date().toISOString(),
                registradoPor: usuarioActual?.nombre || 'Admin'
            });
        }
        alert(`✅ Fondo establecido: RD$ ${nuevoFondo}`);
    }
    cargarFondosAdmin();
};

window.eliminarMovimientoFondo = async function(id) {
    if (!confirm('¿Eliminar este movimiento del historial?\n\n(NO revierte el fondo, solo borra el registro)')) return;
    await db.ref(`historial_fondos/${id}`).remove();
    alert('Movimiento eliminado');
    cargarFondosAdmin();
};

// ============================================================
// ========== GASTOS ==========
// ============================================================
window.cargarGastosAdmin = function() {
    document.getElementById('pageTitle').textContent = 'Gastos';
    window.estoyEnCuadre = false;

    const totalGastos = gastos.reduce((s,g) => s + g.monto, 0);

    let html = `
        <div class="mobile-card" style="background: linear-gradient(135deg, var(--naranja), #c2410c); color: white; border-bottom: 4px solid var(--dorado);">
            <label style="font-size:10px; font-weight:800; opacity:0.9; text-transform:uppercase;">💰 Total Gastos Registrados</label>
            <h2 style="font-size:26px; font-weight:900;">RD$ ${totalGastos.toFixed(2)}</h2>
            <p style="font-size:11px; opacity:0.9;">Se descuentan automáticamente de la comisión</p>
        </div>

        <div class="mobile-card">
            <h3 style="font-size:14px; margin-bottom:12px; color:var(--azul-rey); font-weight:800;">➕ Registrar Gasto</h3>
            <select id="gastoBanca" class="mobile-input">
                <option value="kiko1">Banca Kiko 1</option>
                <option value="kiko2">Banca Kiko 2</option>
                <option value="kiko3">Banca Kiko 3</option>
            </select>
            <select id="gastoTipo" class="mobile-input">
                <option value="dienta">🍽️ Dienta / Comida</option>
                <option value="domingo">⛪ Diente Domingo</option>
                <option value="fiesta">🎉 Día de Fiesta</option>
                <option value="deposito">🏦 Depósito Bancario</option>
                <option value="limpieza">🧽 Limpieza</option>
                <option value="transporte">🚕 Transporte</option>
                <option value="papeleria">📄 Papelería</option>
                <option value="otro">📌 Otro</option>
            </select>
            <input type="number" id="gastoMonto" class="mobile-input" placeholder="Monto RD$">
            <input type="text" id="gastoNota" class="mobile-input" placeholder="Nota (opcional)">
            <button class="mobile-btn btn-primary-filled" onclick="registrarGasto()">✅ Registrar Gasto</button>
            <p style="font-size:10px; color:var(--text-muted); text-align:center; margin-top:6px;">
                💡 El gasto se descuenta automáticamente de la comisión de la banca.
            </p>
        </div>

        <p style="font-weight:800; font-size:11px; margin:12px 0 6px; color:var(--texto-gris); text-transform:uppercase;">📋 Historial de Gastos (${gastos.length})</p>
    `;

    if (gastos.length === 0) {
        html += '<p style="text-align:center; padding:20px; color:var(--text-muted);">Sin gastos registrados.</p>';
    } else {
        const ordenados = [...gastos].sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
        ordenados.forEach((g, i) => {
            const info = ICONOS_GASTO[g.tipoGasto] || ICONOS_GASTO.otro;
            const nombreBanca = getNombreBancaCompleto(g.banca);
            html += `
                <div class="mobile-card gasto-card">
                    <div class="card-top">
                        <span class="card-title"><span class="card-index">#${i+1}</span>${info.icon} ${info.label}</span>
                        <span class="mobile-badge badge-warning">RD$ ${g.monto.toFixed(2)}</span>
                    </div>
                    <p style="font-size:11px; color:var(--text-muted); margin-top:4px;">
                        <b>${nombreBanca}</b><br>
                        ${g.nota || ''}<br>
                        📅 ${g.fecha} · ${g.hora}
                    </p>
                    <div class="card-actions">
                        <button class="mini-btn mini-btn-danger" onclick="eliminarGasto('${g.id}')"><i class="fa-solid fa-trash"></i> Eliminar</button>
                    </div>
                </div>
            `;
        });

        html += `
            <button class="mobile-btn btn-danger" style="margin-top:16px;" onclick="borrarTodosLosGastos()">
                <i class="fa-solid fa-trash"></i> Borrar TODOS los Gastos (${gastos.length})
            </button>
            <p style="font-size:10px; color:var(--text-muted); text-align:center; margin-top:6px; margin-bottom:20px;">
                ⚠️ También elimina los descuentos de comisión asociados.
            </p>
        `;
    }

    document.getElementById('contentArea').innerHTML = html;
};

window.registrarGasto = async function() {
    const banca = document.getElementById('gastoBanca').value;
    const tipoGasto = document.getElementById('gastoTipo').value;
    const monto = parseFloat(document.getElementById('gastoMonto').value) || 0;
    const nota = document.getElementById('gastoNota').value.trim() || '';
    if (monto <= 0) return alert('Ingrese un monto válido');

    const gastoRef = await db.ref('gastos').push({
        banca, tipoGasto, monto, nota,
        fecha: new Date().toLocaleDateString('es-DO'),
        hora: new Date().toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' }),
        timestamp: new Date().toISOString(),
        registradoPor: usuarioActual?.nombre || 'Admin'
    });

    await db.ref('comisiones').push({
        banca: banca,
        monto: -monto,
        nota: `Gasto: ${ICONOS_GASTO[tipoGasto]?.label || 'Gasto'}${nota ? ' - ' + nota : ''}`,
        tipo: 'gasto',
        gastoId: gastoRef.key,
        fecha: new Date().toLocaleDateString('es-DO'),
        hora: new Date().toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' }),
        timestamp: new Date().toISOString(),
        retirado: false
    });

    alert(`✅ Gasto de RD$ ${monto} registrado.\n\nSe descontó automáticamente de la comisión de la banca.`);
    cargarGastosAdmin();
};

window.eliminarGasto = async function(id) {
    if (!confirm('¿Eliminar este gasto?\n\n⚠️ También se eliminará el descuento de la comisión.')) return;
    const gasto = gastos.find(g => g.id === id);
    if (!gasto) return;
    
    const comisionAsociada = comisiones.find(c => c.gastoId === id);
    if (comisionAsociada) {
        await db.ref(`comisiones/${comisionAsociada.id}`).remove();
    }
    
    await db.ref(`gastos/${id}`).remove();
    alert('✅ Gasto eliminado (y el descuento de comisión)');
    cargarGastosAdmin();
};

window.borrarTodosLosGastos = async function() {
    if (!confirm(`⚠️ ¿Borrar TODOS los gastos registrados (${gastos.length})?\n\nTambién se eliminarán los descuentos de comisión asociados.\n\nEsta acción NO se puede deshacer.`)) return;
    
    const segundaConfirmacion = prompt('Escribe "BORRAR" en mayúsculas para confirmar:');
    if (segundaConfirmacion !== 'BORRAR') {
        return alert('❌ Operación cancelada');
    }
    
    try {
        const comisionesDeGastos = comisiones.filter(c => c.tipo === 'gasto' || c.gastoId);
        for (let c of comisionesDeGastos) {
            await db.ref(`comisiones/${c.id}`).remove();
        }
        
        const totalGastos = gastos.length;
        for (let g of gastos) {
            await db.ref(`gastos/${g.id}`).remove();
        }
        
        alert(`✅ Se eliminaron ${totalGastos} gastos y sus descuentos de comisión.`);
        cargarGastosAdmin();
    } catch (e) {
        console.error('Error al borrar gastos:', e);
        alert('❌ Error: ' + e.message);
    }
};

// ============================================================
// ========== DÍAS LIBRES ==========
// ============================================================
window.cargarDiasLibresAdmin = function() {
    document.getElementById('pageTitle').textContent = 'Días Libres';
    window.estoyEnCuadre = false;

    let html = `
        <div class="mobile-card" style="background:#ede9fe; border-left:5px solid #7c3aed;">
            <h3 style="font-size:13px; color:#6d28d9; font-weight:800; margin-bottom:6px;">ℹ️ Días Libres Fijos</h3>
            <p style="font-size:11px; color:#6d28d9; line-height:1.5;">
                Los días libres se asignan como <b>día fijo de la semana</b>.<br>
                Se configuran en el perfil de cada empleada.
            </p>
        </div>
        <p style="font-weight:800; font-size:11px; margin:12px 0 6px; color:var(--texto-gris); text-transform:uppercase;">📅 Empleadas y su Día Libre</p>
    `;

    if (empleados.length === 0) {
        html += '<p style="text-align:center; padding:20px; color:var(--text-muted);">No hay empleadas registradas.</p>';
    } else {
        empleados.forEach((emp, i) => {
            const diaLibreTexto = (emp.diaLibre === -1 || emp.diaLibre === undefined || emp.diaLibre === null) 
                ? '🚫 No lleva días libres' 
                : `📅 Todos los ${DIAS_SEMANA[emp.diaLibre]?.nombre || '?'}`;
            html += `
                <div class="mobile-card dia-libre-card">
                    <div class="card-top">
                        <span class="card-title"><span class="card-index">#${i+1}</span>${emp.nombre}</span>
                        <span class="mobile-badge badge-libre">${diaLibreTexto}</span>
                    </div>
                    <p style="font-size:11px; color:var(--text-muted); margin-top:4px;">
                        ${bancas[emp.banca]?.nombre || emp.banca}
                    </p>
                    <div class="card-actions">
                        <button class="mini-btn mini-btn-warning" onclick="cambiarDiaLibreEmpleada('${emp.id}')"><i class="fa-solid fa-pen"></i> Cambiar Día</button>
                    </div>
                </div>
            `;
        });
    }

    document.getElementById('contentArea').innerHTML = html;
};

window.cambiarDiaLibreEmpleada = async function(id) {
    const emp = empleados.find(e => e.id === id);
    if (!emp) return;
    const diaActual = emp.diaLibre ?? -1;
    const msg = `Día libre actual de ${emp.nombre}: ${diaActual === -1 ? 'No lleva' : DIAS_SEMANA[diaActual]?.nombre}\n\nIngrese el nuevo día:\n0 = Domingo\n1 = Lunes\n2 = Martes\n3 = Miércoles\n4 = Jueves\n5 = Viernes\n6 = Sábado\n-1 = No lleva días libres`;
    const nuevo = prompt(msg, diaActual);
    if (nuevo === null) return;
    const num = parseInt(nuevo);
    if (isNaN(num) || num < -1 || num > 6) return alert('Valor inválido');
    await db.ref(`empleados/${id}`).update({ diaLibre: num });
    alert(`✅ Día libre actualizado: ${num === -1 ? 'No lleva' : DIAS_SEMANA[num]?.nombre}`);
    cargarDiasLibresAdmin();
};

window.cargarMisDiasLibres = function() {
    if (!usuarioActual) return;
    document.getElementById('pageTitle').textContent = 'Mis Días Libres';
    window.estoyEnCuadre = false;

    const emp = empleados.find(e => e.id === usuarioActual.id);
    const diaLibre = emp?.diaLibre ?? -1;
    const diaLibreTexto = diaLibre === -1 
        ? 'No tienes día libre asignado' 
        : `Todos los ${DIAS_SEMANA[diaLibre]?.nombre}`;

    document.getElementById('contentArea').innerHTML = `
        <div class="mobile-card" style="background: linear-gradient(135deg, #7c3aed, #5b21b6); color: white; border-bottom: 4px solid var(--dorado); text-align:center; padding:24px;">
            <i class="fa-solid fa-calendar-days" style="font-size:48px; margin-bottom:12px;"></i>
            <h2 style="font-size:22px; font-weight:900; margin-bottom:6px;">${diaLibreTexto}</h2>
            <p style="font-size:11px; opacity:0.9;">Tu día libre semanal fijo</p>
        </div>
    `;
};

// ============================================================
// ========== NÓMINA ==========
// ============================================================
window.cargarNominaAdmin = function() {
    document.getElementById('pageTitle').textContent = 'Nómina Quincenal';
    window.estoyEnCuadre = false;

    let html = `
        <div class="mobile-card">
            <h3 style="font-size:14px; margin-bottom:12px; color:var(--azul-rey); font-weight:800;">💰 Registrar Pago de Nómina</h3>
            <select id="nominaEmpleada" class="mobile-input">
                <option value="">Seleccione empleada</option>
                ${empleados.map(e => `<option value="${e.id}">${e.nombre} - ${bancas[e.banca]?.nombre || ''}</option>`).join('')}
            </select>
            <select id="nominaTipo" class="mobile-input">
                <option value="sueldo">💵 Sueldo Quincenal</option>
                <option value="bono">🎁 Bono</option>
                <option value="descuento">➖ Descuento (Faltante)</option>
            </select>
            <input type="number" id="nominaMonto" class="mobile-input" placeholder="Monto RD$">
            <input type="text" id="nominaNota" class="mobile-input" placeholder="Nota (opcional)">
            <button class="mobile-btn btn-primary-filled" onclick="registrarNomina()">✅ Registrar</button>
        </div>
        <p style="font-weight:800; font-size:11px; margin:8px 0; color:var(--texto-gris); text-transform:uppercase;">📋 Resumen por Empleada</p>
    `;

    const empleadasConResumen = empleados.map(emp => {
        const misNominas = nominas.filter(n => n.empleadaId === emp.id);
        const nomTotal = misNominas.reduce((s,n) => s + (n.monto || 0), 0);
        const faltantes = cuadresPendientes.filter(cp => cp.empleadaId === emp.id && cp.descontarNomina);
        const totalFaltantes = faltantes.reduce((s, cp) => s + Math.abs(cp.faltanteNomina || cp.diferencia || 0), 0);
        const totalAPagar = (emp.sueldoBase || 0) + nomTotal - totalFaltantes;
        return { emp, nomTotal, totalFaltantes, totalAPagar, misNominas };
    });

    empleadasConResumen.forEach(({ emp, nomTotal, totalFaltantes, totalAPagar, misNominas }, i) => {
        html += `
            <div class="mobile-card">
                <div class="card-top">
                    <span class="card-title"><span class="card-index">#${i+1}</span>${emp.nombre}</span>
                    <span class="mobile-badge badge-success">RD$ ${totalAPagar.toFixed(2)}</span>
                </div>
                <div class="card-row-data" style="grid-template-columns: repeat(3, 1fr); padding:6px; gap:4px;">
                    <div><label>Sueldo</label><p style="font-size:11px;">RD$ ${(emp.sueldoBase||0).toFixed(2)}</p></div>
                    <div><label>Ajustes</label><p style="font-size:11px; color:${nomTotal >= 0 ? 'var(--success)' : 'var(--danger)'}">RD$ ${nomTotal.toFixed(2)}</p></div>
                    <div><label>Faltantes</label><p style="font-size:11px; color:var(--danger)">-RD$ ${totalFaltantes.toFixed(2)}</p></div>
                </div>
                ${misNominas.length > 0 ? `
                    <p style="font-weight:800; font-size:10px; color:var(--texto-gris); margin:8px 0 4px; text-transform:uppercase;">Detalle</p>
                    ${misNominas.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).map(n => `
                        <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px; padding:6px 0; border-bottom:1px solid #f1f5f9; gap:6px;">
                            <div style="flex:1;">
                                <span>${n.tipo === 'sueldo' ? '💵' : n.tipo === 'bono' ? '🎁' : '➖'} ${n.tipo}</span>
                                <b style="color:${n.monto < 0 ? 'var(--danger)' : 'var(--success)'}">RD$ ${n.monto.toFixed(2)}</b>
                                <br><span style="color:var(--text-muted); font-size:9px;">${n.nota || ''} · ${n.fecha}</span>
                            </div>
                            <button class="mini-btn mini-btn-danger" style="flex:0; min-width:36px; padding:4px 6px;" onclick="eliminarNomina('${n.id}')"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    `).join('')}
                ` : ''}
            </div>
        `;
    });

    document.getElementById('contentArea').innerHTML = html;
};

window.registrarNomina = async function() {
    const empleadaId = document.getElementById('nominaEmpleada').value;
    const tipo = document.getElementById('nominaTipo').value;
    const montoInput = parseFloat(document.getElementById('nominaMonto').value) || 0;
    const nota = document.getElementById('nominaNota').value || '';
    if (!empleadaId || montoInput <= 0) return alert('Complete los datos');
    const emp = empleados.find(e => e.id === empleadaId);
    if (!emp) return;
    const monto = tipo === 'descuento' ? -Math.abs(montoInput) : Math.abs(montoInput);
    await db.ref('nominas').push({
        empleadaId, empleadaNombre: emp.nombre, banca: emp.banca,
        tipo, monto, nota,
        fecha: new Date().toLocaleDateString('es-DO'),
        timestamp: new Date().toISOString(),
        registradoPor: usuarioActual?.nombre || 'Admin'
    });
    alert('✅ Nómina registrada');
    cargarNominaAdmin();
};

window.eliminarNomina = async function(id) {
    if (!confirm('¿Eliminar este registro de nómina?')) return;
    await db.ref(`nominas/${id}`).remove();
    alert('Eliminado');
    cargarNominaAdmin();
};

// ============================================================
// ========== PANEL ADMIN ==========
// ============================================================
window.cargarPanelAdmin = function() {
    document.getElementById('pageTitle').textContent = 'Panel Administrador';
    window.estoyEnCuadre = false;
    let html = `
        <div class="mobile-grid-stats" style="grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 12px;">
            <button class="mobile-btn btn-primary-filled" style="margin:0; padding:12px 4px; font-size:11px;" onclick="abrirModalRegistrar('prestamo')"><i class="fa-solid fa-plus-circle"></i> + Préstamo</button>
            <button class="mobile-btn btn-warning-filled" style="margin:0; padding:12px 4px; font-size:11px;" onclick="abrirModalRetirar('prestamo')"><i class="fa-solid fa-minus-circle"></i> - Préstamo</button>
            <button class="mobile-btn btn-primary-filled" style="margin:0; padding:12px 4px; font-size:11px; background:var(--success);" onclick="abrirModalRegistrar('comision')"><i class="fa-solid fa-plus-circle"></i> + Comisión</button>
            <button class="mobile-btn btn-warning-filled" style="margin:0; padding:12px 4px; font-size:11px;" onclick="abrirModalRetirar('comision')"><i class="fa-solid fa-minus-circle"></i> - Comisión</button>
            <button class="mobile-btn btn-primary-filled" style="margin:0; padding:12px 4px; font-size:11px; background:#6b7280;" onclick="abrirModalRegistrar('central')"><i class="fa-solid fa-plus-circle"></i> + C. Central</button>
            <button class="mobile-btn btn-warning-filled" style="margin:0; padding:12px 4px; font-size:11px;" onclick="abrirModalRetirar('central')"><i class="fa-solid fa-minus-circle"></i> - C. Central</button>
            <button class="mobile-btn btn-primary-filled" style="margin:0; padding:12px 4px; font-size:11px; background:var(--naranja);" onclick="cargarGastosAdmin()"><i class="fa-solid fa-receipt"></i> Gastos</button>
            <button class="mobile-btn btn-primary-filled" style="margin:0; padding:12px 4px; font-size:11px; background:#8b5cf6;" onclick="cargarDiasLibresAdmin()"><i class="fa-solid fa-calendar-days"></i> Días Libres</button>
            <button class="mobile-btn btn-primary-filled" style="margin:0; padding:12px 4px; font-size:11px; background:var(--dorado); color:var(--azul-oscuro);" onclick="cargarFondosAdmin()"><i class="fa-solid fa-vault"></i> Fondos</button>
            <button class="mobile-btn btn-primary-filled" style="margin:0; padding:12px 4px; font-size:11px; background:#0ea5e9;" onclick="cargarWebAdmin()"><i class="fa-solid fa-globe"></i> Página Web</button>
        </div>
        <p style="font-weight:800; font-size:11px; color:var(--text-muted); margin:12px 0 6px; text-transform:uppercase;">📊 Estado de Cuentas por Bancas</p>
    `;
    let idx = 0;
    for (let [key, b] of Object.entries(bancas)) {
        idx++;
        const nombreBancaCompleto = getNombreBancaCompleto(key);
        const misCuadresPend = cuadresPendientes.filter(cp => cp.banca === key);
        const pTotal = prestamos.filter(p => p.banca === key && !p.retirado).reduce((s,p) => s + p.monto, 0);
        const cenTotal = cuadresCentral.filter(cc => cc.banca === key && !cc.retirado).reduce((s,cc) => s + cc.monto, 0);
        const gastosTotal = gastos.filter(g => g.banca === key).reduce((s,g) => s + g.monto, 0);
        
        const calcCom = calcularComisionYRecargas(key);
        const comClass = calcCom.totalGlobal < 0 ? 'comision-negativa' : '';
        
        html += `
            <div class="mobile-card ${comClass}">
                <div class="card-top"><span class="card-title"><span class="card-index">#${idx}</span>${nombreBancaCompleto}</span> <span class="mobile-badge badge-success">Base: RD$ ${b.fondo}</span></div>
                <div class="card-row-data" style="grid-template-columns: repeat(3, 1fr); padding:6px; gap:4px;">
                    <div><label>Préstamos</label><p style="font-size:11px;">RD$ ${pTotal}</p></div>
                    <div><label>Comisión y Recargas Ex.</label><p style="font-size:11px; color:${calcCom.totalGlobal < 0 ? 'var(--danger)' : 'var(--success)'}; font-weight:900;">RD$ ${calcCom.totalGlobal.toFixed(2)}</p></div>
                    <div><label>C. Central</label><p style="font-size:11px;">RD$ ${cenTotal}</p></div>
                    <div><label>Gastos</label><p style="font-size:11px; color:var(--naranja);">RD$ ${gastosTotal}</p></div>
                </div>
                <div style="background:#f8fafc; padding:8px; border-radius:10px; margin-bottom:8px; font-size:10px; line-height:1.6;">
                    <div style="display:flex; justify-content:space-between;"><span>💵 Comisiones:</span><b>RD$ ${calcCom.totalComisionesManuales.toFixed(2)}</b></div>
                    <div style="display:flex; justify-content:space-between;"><span>📱 Recargas/Serv:</span><b>RD$ ${calcCom.totalRecargas.toFixed(2)}</b></div>
                    <div style="display:flex; justify-content:space-between;"><span>🍽️ Gastos:</span><b style="color:var(--danger);">RD$ ${calcCom.totalGastos.toFixed(2)}</b></div>
                    <div style="display:flex; justify-content:space-between;"><span>⚠️ Faltantes:</span><b style="color:var(--danger);">RD$ ${calcCom.totalFaltantes.toFixed(2)}</b></div>
                </div>
                <div class="summary-box" style="margin-bottom:8px; background:#f1f5f9; font-size:11px;">
                    <b>📋 Cuadres pendientes:</b> ${misCuadresPend.length}
                </div>
                <button class="mobile-btn btn-success-filled" style="padding:8px; font-size:11px;" onclick="limpiarCuadresPendientes('${key}')">🧹 Limpiar Cuadres Pendientes</button>
                <button class="mobile-btn btn-danger" style="padding:8px; font-size:11px; margin-top:6px; background:var(--danger);" onclick="limpiarHistorialCompletoBanca('${key}')">🗑️ Limpiar Historial Antiguo</button>
            </div>
        `;
    }
    document.getElementById('contentArea').innerHTML = html;
};

window.limpiarHistorialCompletoBanca = async function(bancaKey) {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - 30);
    if(!confirm(`¿Limpiar historial ANTIGUO (más de 30 días) de ${bancaKey}?`)) return;
    const prestamosAntiguos = prestamos.filter(p => p.banca === bancaKey && p.retirado && new Date(p.fechaRetiro) < fechaLimite);
    for(let p of prestamosAntiguos) await db.ref(`prestamos/${p.id}`).remove();
    const comisionesAntiguas = comisiones.filter(c => c.banca === bancaKey && c.retirado && new Date(c.fechaRetiro) < fechaLimite);
    for(let c of comisionesAntiguas) await db.ref(`comisiones/${c.id}`).remove();
    const centralAntiguos = cuadresCentral.filter(cc => cc.banca === bancaKey && cc.retirado && new Date(cc.fechaRetiro) < fechaLimite);
    for(let cc of centralAntiguos) await db.ref(`cuadres_central/${cc.id}`).remove();
    alert(`Historial antiguo limpiado para ${bancaKey}`);
    cargarPanelAdmin();
};

window.limpiarHistorialCliente = async function(clienteId, clienteNombre) {
    if(!confirm(`¿Limpiar historial de transacciones de "${clienteNombre}"?`)) return;
    const deudasCliente = deudas.filter(d => d.clienteId === clienteId);
    for(let d of deudasCliente) await db.ref(`deudas/${d.id}`).remove();
    alert(`✅ Historial limpiado`);
    if(usuarioActual.rol === 'admin') cargarClientesAdmin(); else cargarClientesEmpleada();
};

// ========== MODALES REGISTRAR/RETIRAR ==========
window.abrirModalRegistrar = function(tipo) {
    document.getElementById('registrarTipoMovimiento').value = tipo;
    let titulo = '';
    if(tipo === 'prestamo') titulo = '🏦 Registrar Préstamo';
    if(tipo === 'comision') titulo = '📊 Registrar Comisión';
    if(tipo === 'central') titulo = '🏢 Registrar Cuadre Central';
    document.getElementById('lblRegistrarModalTitulo').textContent = titulo;
    document.getElementById('wrapperTipoPrestamo').classList.toggle('hidden', tipo !== 'prestamo');
    document.getElementById('registrarMonto').value = '';
    document.getElementById('registrarNota').value = '';
    document.getElementById('registrarFecha').value = new Date().toISOString().slice(0,16);
    abrirModal('modalRegistrarTrans');
};

window.guardarMovimientoRegistrar = async function() {
    const tipo = document.getElementById('registrarTipoMovimiento').value;
    const banca = document.getElementById('registrarBanca').value;
    const monto = parseFloat(document.getElementById('registrarMonto').value) || 0;
    const nota = document.getElementById('registrarNota').value || 'Registro Manual';
    const tipoPrestamo = document.getElementById('registrarTipoPrestamo')?.value || 'pinpo';
    const fechaPersonalizada = document.getElementById('registrarFecha').value;
    if(monto <= 0) return alert("Indique un monto válido.");
    const ahora = fechaPersonalizada ? new Date(fechaPersonalizada) : new Date();
    const datos = {
        banca, monto, nota, retirado: false,
        fecha: ahora.toLocaleDateString('es-DO'),
        hora: ahora.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' }),
        timestamp: ahora.toISOString()
    };
    if(tipo === 'prestamo') {
        datos.tipoPrestamo = tipoPrestamo;
        await db.ref('prestamos').push(datos);
        alert(`Préstamo ${tipoPrestamo.toUpperCase()} registrado`);
    }
    if(tipo === 'comision') {
        datos.tipo = 'comision';
        await db.ref('comisiones').push(datos);
        alert('Comisión registrada');
    }
    if(tipo === 'central') {
        await db.ref('cuadres_central').push(datos);
        alert('Cuadre Central registrado');
    }
    cerrarModal('modalRegistrarTrans');
    cargarPanelAdmin();
};

window.abrirModalRetirar = function(tipo) {
    document.getElementById('retirarTipoMovimiento').value = tipo;
    let titulo = '';
    if(tipo === 'prestamo') titulo = '🏦 Retirar Préstamo';
    if(tipo === 'comision') titulo = '📊 Retirar Comisión';
    if(tipo === 'central') titulo = '🏢 Retirar Cuadre Central';
    document.getElementById('lblRetirarModalTitulo').textContent = titulo;
    let items = [];
    if(tipo === 'prestamo') items = prestamos.filter(p => !p.retirado);
    if(tipo === 'comision') items = comisiones.filter(c => !c.retirado);
    if(tipo === 'central') items = cuadresCentral.filter(cc => !cc.retirado);
    let options = '<option value="">Seleccione un movimiento</option>';
    items.forEach(item => {
        const tipoLabel = item.tipoPrestamo ? ` [${item.tipoPrestamo.toUpperCase()}]` : '';
        let tipoIcon = '';
        if (item.tipo === 'gasto') tipoIcon = '🍽️ ';
        else if (item.tipo === 'faltante_cuadre') tipoIcon = '⚠️ ';
        else if (item.tipo === 'recarga') tipoIcon = '📱 ';
        else if (item.tipo === 'comision') tipoIcon = '💵 ';
        options += `<option value="${item.id}">${tipoIcon}${item.banca.toUpperCase()}${tipoLabel} - RD$ ${item.monto} (${item.fecha} ${item.hora || ''})</option>`;
    });
    document.getElementById('retirarItemsList').innerHTML = options;
    document.getElementById('retirarFecha').value = new Date().toISOString().slice(0,16);
    abrirModal('modalRetirarTrans');
};

window.retirarMovimiento = async function() {
    const tipo = document.getElementById('retirarTipoMovimiento').value;
    const itemId = document.getElementById('retirarItemsList').value;
    const fechaRetiroPersonalizada = document.getElementById('retirarFecha').value;
    if(!itemId) return alert('Seleccione un movimiento');
    if(!confirm('¿Retirar este movimiento?')) return;
    const fechaRetiro = fechaRetiroPersonalizada ? new Date(fechaRetiroPersonalizada) : new Date();
    const updateData = { 
        retirado: true, 
        fechaRetiro: fechaRetiro.toISOString()
    };
    if(tipo === 'prestamo') await db.ref(`prestamos/${itemId}`).update(updateData);
    else if(tipo === 'comision') await db.ref(`comisiones/${itemId}`).update(updateData);
    else if(tipo === 'central') await db.ref(`cuadres_central/${itemId}`).update(updateData);
    cerrarModal('modalRetirarTrans');
    alert('Movimiento retirado');
    cargarPanelAdmin();
};

window.limpiarCuadresPendientes = async function(bancaKey) {
    if(!confirm(`¿Limpiar TODOS los cuadres pendientes de ${bancaKey}?`)) return;
    const cpActivos = cuadresPendientes.filter(cp => cp.banca === bancaKey);
    for(let cp of cpActivos) {
        await db.ref('cuadres_historial').push({ ...cp, estado: 'REVISADO POR ADMIN', fechaCierre: new Date().toLocaleString('es-DO') });
        await db.ref(`cuadres_pendientes/${cp.id}`).remove();
    }
    alert(`Se limpiaron ${cpActivos.length} cuadres`);
    cargarPanelAdmin();
};

// ========== HISTORIAL ==========
window.abrirHistorialCuadresAdmin = function() {
    document.getElementById('pageTitle').textContent = 'Historial General';
    window.estoyEnCuadre = false;
    document.getElementById('contentArea').innerHTML = `
        <div class="summary-box" style="background:#fff;">
            <label class="input-sublabel">📅 Filtrar por fechas</label>
            <div class="input-row">
                <input type="date" id="historialFechaDesde" class="mobile-input" style="margin-bottom:0;">
                <input type="date" id="historialFechaHasta" class="mobile-input" style="margin-bottom:0;">
            </div>
            <button class="mobile-btn btn-primary-filled" style="margin-top:8px;" onclick="filtrarHistorial()">🔍 Filtrar</button>
            <button class="mobile-btn btn-warning-filled" onclick="limpiarFiltroHistorial()">🔄 Mostrar Todos</button>
        </div>
        <div id="historialLista"></div>
    `;
    mostrarHistorialFiltrado();
};

function mostrarHistorialFiltrado() {
    let historialFiltrado = [...cuadresHistorial];
    const desde = document.getElementById('historialFechaDesde')?.value;
    const hasta = document.getElementById('historialFechaHasta')?.value;
    if(desde) historialFiltrado = historialFiltrado.filter(h => new Date(h.fechaCierre || h.fecha) >= new Date(desde));
    if(hasta) { const fh = new Date(hasta); fh.setHours(23,59,59); historialFiltrado = historialFiltrado.filter(h => new Date(h.fechaCierre || h.fecha) <= fh); }
    historialFiltrado.reverse();
    if(historialFiltrado.length === 0) {
        document.getElementById('historialLista').innerHTML = '<p style="text-align:center; padding:30px; color:var(--text-muted);">No hay registros.</p>';
        return;
    }
    let html = '';
    historialFiltrado.forEach((c, i) => {
        html += `
            <div class="mobile-card">
                <div class="card-top"><span class="card-title"><span class="card-index">#${i+1}</span>${c.banca?.toUpperCase() || 'N/A'}</span> <span class="mobile-badge badge-danger">${c.estado || 'ARCHIVADO'}</span></div>
                <p style="font-size:12px; line-height:1.4;"><b>Operadora:</b> ${c.empleada || c.empleadaNombre || 'Desconocida'}<br>
                <b>Efectivo:</b> RD$ ${c.totalEfectivoCalculado || 0} | <b>Diferencia:</b> ${c.diferencia || 0}<br>
                <b>Fecha:</b> ${c.fechaCierre || c.fechaEnvio || c.fecha || ''}</p>
                <button class="mobile-btn btn-warning-filled" style="padding:5px; font-size:11px; margin-top:8px;" onclick="eliminarHistorialCuadre('${c.id}')">🗑️ Eliminar</button>
            </div>
        `;
    });
    document.getElementById('historialLista').innerHTML = html;
}

window.filtrarHistorial = function() { mostrarHistorialFiltrado(); };
window.limpiarFiltroHistorial = function() {
    if(document.getElementById('historialFechaDesde')) document.getElementById('historialFechaDesde').value = '';
    if(document.getElementById('historialFechaHasta')) document.getElementById('historialFechaHasta').value = '';
    mostrarHistorialFiltrado();
};
window.eliminarHistorialCuadre = async function(id) {
    if(!confirm("¿Eliminar este registro?")) return;
    await db.ref(`cuadres_historial/${id}`).remove();
    alert('Registro eliminado.');
    mostrarHistorialFiltrado();
};

// ============================================================
// ========== VISTA EMPLEADA ==========
// ============================================================
window.cargarPanelEmpleada = function() {
    if (!usuarioActual) return;
    document.getElementById('pageTitle').textContent = 'Mi Banca';
    window.estoyEnCuadre = false;
    const bKey = usuarioActual.banca;
    const nombreBanca = getNombreBancaCompleto(bKey);
    const misClientes = clientes.filter(c => c.banca === bKey);
    const fTotalClientes = misClientes.reduce((s,c) => s + (c.fondo || 0), 0);
    const dTotalClientes = misClientes.reduce((s,c) => s + (c.deuda || 0), 0);
    const fBanca = bancas[bKey]?.fondo || 0;
    const pPinpo = prestamos.filter(p => p.banca === bKey && !p.retirado && p.tipoPrestamo === 'pinpo').reduce((s,p) => s + p.monto, 0);
    const pJesus = prestamos.filter(p => p.banca === bKey && !p.retirado && p.tipoPrestamo === 'jesus').reduce((s,p) => s + p.monto, 0);
    const cenTotal = cuadresCentral.filter(cc => cc.banca === bKey && !cc.retirado).reduce((s,cc) => s + cc.monto, 0);
    const cPendientes = cuadresPendientes.filter(cp => cp.banca === bKey).length;
    
    const calcCom = calcularComisionYRecargas(bKey);

    const misNominas = nominas.filter(n => n.empleadaId === usuarioActual.id);
    const nominaTotal = misNominas.reduce((s,n) => s + (n.monto || 0), 0);
    const misFaltantesPendientes = cuadresPendientes.filter(cp => cp.empleadaId === usuarioActual.id && cp.descontarNomina);
    const totalFaltantes = misFaltantesPendientes.reduce((s, cp) => s + Math.abs(cp.faltanteNomina || cp.diferencia || 0), 0);
    const quincenaEstimada = (usuarioActual.sueldoBase || 0) + nominaTotal - totalFaltantes;

    document.getElementById('contentArea').innerHTML = `
        <div class="mobile-card" style="background: linear-gradient(135deg, var(--azul-rey), var(--azul-oscuro)); color: white; margin-bottom:8px; border-bottom: 4px solid var(--dorado);">
            <label style="font-size:10px; opacity:0.85; font-weight:800; text-transform:uppercase; letter-spacing:1px;">💰 Fondo Total Clientes</label>
            <h2 style="font-size:26px; font-weight:900;">RD$ ${fTotalClientes.toFixed(2)}</h2>
            <p style="font-size:11px; opacity:0.9; margin-top:4px;">${nombreBanca}</p>
        </div>

        <div class="mobile-grid-stats">
            <div class="stat-box-app"><h4>Fondo Base Banca</h4><p>RD$ ${fBanca}</p></div>
            <div class="stat-box-app"><h4>Deuda Total Clientes</h4><p style="color:var(--danger)">RD$ ${dTotalClientes.toFixed(2)}</p></div>
        </div>
        <p style="font-weight:800; font-size:11px; color:var(--text-muted); margin:10px 0 4px; text-transform:uppercase;">📊 Movimientos</p>
        <div class="mobile-grid-stats" style="grid-template-columns: repeat(2, 1fr);">
            <div class="stat-box-app" style="padding:10px 6px;"><h4>Préstamo PINPO</h4><p style="font-size:12px;">RD$ ${pPinpo}</p></div>
            <div class="stat-box-app" style="padding:10px 6px;"><h4>Préstamo JESÚS</h4><p style="font-size:12px;">RD$ ${pJesus}</p></div>
        </div>
        <div class="mobile-grid-stats" style="grid-template-columns: repeat(2, 1fr);">
            <div class="stat-box-app" style="padding:10px 6px;">
                <h4>Comisión y Recargas</h4>
                <p style="font-size:12px; color:${calcCom.totalGlobal < 0 ? 'var(--danger)' : 'inherit'};">RD$ ${calcCom.totalGlobal.toFixed(2)}</p>
            </div>
            <div class="stat-box-app" style="padding:10px 6px;"><h4>C. Central</h4><p style="font-size:12px;">RD$ ${cenTotal}</p></div>
        </div>
        <div class="mobile-grid-stats" style="grid-template-columns: repeat(2, 1fr);">
            <div class="stat-box-app" style="padding:10px 6px;"><h4>Recargas Ex.</h4><p style="font-size:12px;">RD$ ${calcCom.totalRecargas.toFixed(2)}</p></div>
            <div class="stat-box-app" style="padding:10px 6px;"><h4>Cuadres Pend.</h4><p style="font-size:12px;">${cPendientes}</p></div>
        </div>

        <div class="quincena-hero">
            <label>💰 Mi Quincena Estimada</label>
            <h2>RD$ ${quincenaEstimada.toFixed(2)}</h2>
            <p>Sueldo base RD$ ${(usuarioActual.sueldoBase||0).toFixed(2)} · Ajustes RD$ ${(nominaTotal - totalFaltantes).toFixed(2)}</p>
        </div>

        <button class="mobile-btn btn-success-filled" onclick="abrirFlujoTransaccion()"><i class="fa-solid fa-square-plus"></i> Ticket / Cobro / Depositar</button>
        <button class="mobile-btn btn-primary-filled" onclick="cargarCentralEmpleada()"><i class="fa-solid fa-building-columns"></i> Registrar C. Central</button>
        <button class="mobile-btn btn-gold-filled" onclick="cargarComisionEmpleada()"><i class="fa-solid fa-percent"></i> Registrar Comisión</button>
        <button class="mobile-btn btn-info" onclick="cargarRecargasEmpleada()"><i class="fa-solid fa-mobile-screen-button"></i> Recargas y Servicios Ex.</button>
    `;
};

function calcularDiasMorosidad(fechaActualizacion) {
    if (!fechaActualizacion) return 99;
    const diffTime = Math.abs(new Date() - new Date(fechaActualizacion));
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// ============================================================
// ========== CLIENTES ==========
// ============================================================
let filtroBusquedaClientes = '';

function renderListaClientesMovil(lista, esAdmin) {
    document.getElementById('pageTitle').textContent = esAdmin ? 'Clientes' : 'Mis Clientes';
    window.estoyEnCuadre = false;
    let html = `
        <button class="mobile-btn btn-primary-filled" style="margin-bottom:12px;" onclick="abrirFichaDetalle('nuevo', ${esAdmin})"><i class="fa-solid fa-user-plus"></i> + Nuevo Cliente</button>
        <div class="search-wrap">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input type="text" id="buscadorClientes" placeholder="Buscar por nombre o WhatsApp..." value="${filtroBusquedaClientes}" oninput="filtrarClientes(this.value, ${esAdmin})">
        </div>
        <p style="font-weight:800; font-size:11px; color:var(--text-muted); margin:8px 0; text-transform:uppercase;">📋 Total: ${lista.length} clientes</p>
    `;

    if(lista.length === 0) {
        html += '<p style="text-align:center; padding:20px; color:var(--text-muted);">No hay clientes registrados.</p>';
    } else {
        lista.forEach((c, i) => {
            const diasMorosidad = calcularDiasMorosidad(c.fechaActualizacion);
            let estadoTexto = '', estadoColor = '';
            if (diasMorosidad <= 2) { estadoTexto = '✅ Al Día'; estadoColor = 'badge-success'; }
            else if (diasMorosidad <= 7) { estadoTexto = `⚠️ Aviso (${diasMorosidad}d)`; estadoColor = 'badge-warning'; }
            else { estadoTexto = `🔴 Moroso (${diasMorosidad}d)`; estadoColor = 'badge-danger'; }
            html += `
                <div class="mobile-card ${diasMorosidad > 2 ? 'moroso-card' : ''}">
                    <div class="card-top">
                        <span class="card-title"><span class="card-index">#${i+1}</span>${c.nombre}</span>
                        <span class="mobile-badge ${estadoColor}">${estadoTexto}</span>
                    </div>
                    <div class="card-row-data">
                        <div class="data-cell"><label>💳 Deuda</label><p style="color:${(c.deuda||0)>0?'var(--danger)':'var(--success)'}">RD$ ${(c.deuda||0).toFixed(2)}</p></div>
                        <div class="data-cell"><label>💰 Fondo</label><p>RD$ ${(c.fondo||0).toFixed(2)}</p></div>
                    </div>
                    <div class="card-actions">
                        <button class="mini-btn mini-btn-success" onclick="abrirCobroCliente('${c.id}')"><i class="fa-solid fa-hand-holding-usd"></i> Cobrar</button>
                        <button class="mini-btn mini-btn-danger" onclick="abrirTicketCliente('${c.id}')"><i class="fa-solid fa-ticket"></i> Ticket</button>
                        <button class="mini-btn mini-btn-info" onclick="abrirDepositoFondo('${c.id}')"><i class="fa-solid fa-money-bill-transfer"></i> Depositar</button>
                        ${(c.fondo||0)>0 && (c.deuda||0)===0 ? `<button class="mini-btn mini-btn-warning" onclick="retirarFondoCliente('${c.id}')"><i class="fa-solid fa-money-bill"></i> Retirar</button>` : ''}
                        <button class="mini-btn" onclick="lanzarRecordatorioPago('${c.id}')"><i class="fa-brands fa-whatsapp"></i> Msj</button>
                        <button class="mini-btn" onclick="abrirFichaDetalle('${c.id}', ${esAdmin})"><i class="fa-solid fa-edit"></i> Editar</button>
                        ${esAdmin ? `<button class="mini-btn mini-btn-danger" onclick="eliminarCliente('${c.id}', '${c.nombre}')"><i class="fa-solid fa-trash"></i> Elim.</button>` : ''}
                    </div>
                </div>
            `;
        });
    }
    document.getElementById('contentArea').innerHTML = html;
}

window.filtrarClientes = function(valor, esAdmin) {
    filtroBusquedaClientes = valor;
    const base = esAdmin ? clientes : clientes.filter(c => c.banca === usuarioActual.banca);
    const v = valor.toLowerCase().trim();
    const filtrados = v ? base.filter(c => (c.nombre||'').toLowerCase().includes(v) || (c.whatsapp||'').includes(v)) : base;
    renderListaClientesMovil(filtrados, esAdmin);
};

window.cargarClientesAdmin = function() { renderListaClientesMovil(clientes, true); };
window.cargarClientesEmpleada = function() { 
    if (!usuarioActual) return;
    renderListaClientesMovil(clientes.filter(c => c.banca === usuarioActual.banca), false); 
};

// ========== FONDOS CLIENTE ==========
window.abrirDepositoFondo = function(clienteId) {
    const c = clientes.find(cl => cl.id === clienteId);
    if (!c) return;
    const montoDeposito = prompt(`💰 DEPOSITAR FONDO\nCliente: ${c.nombre}\nFondo actual: RD$ ${(c.fondo || 0).toFixed(2)}\n\n¿Cuánto desea depositar?`, "0");
    if (!montoDeposito) return;
    const monto = parseFloat(montoDeposito);
    if (isNaN(monto) || monto <= 0) return alert("Monto inválido");
    const nuevoFondo = (c.fondo || 0) + monto;
    db.ref('deudas').push({ clienteId, monto: 0, deposito: monto, concepto: "Depósito de fondo", fecha: new Date().toLocaleDateString('es-DO'), hora: new Date().toLocaleTimeString('es-DO'), timestamp: new Date().toISOString(), tipoOperacion: 'deposito_fondo' });
    db.ref(`clientes/${clienteId}`).update({ fondo: nuevoFondo, fechaActualizacion: new Date().toISOString() });
    alert(`✅ Depósito de RD$ ${monto}. Nuevo fondo: RD$ ${nuevoFondo}`);
    if(usuarioActual.rol === 'admin') cargarClientesAdmin(); else cargarClientesEmpleada();
};

window.retirarFondoCliente = function(clienteId) {
    const c = clientes.find(cl => cl.id === clienteId);
    if (!c) return;
    if ((c.deuda || 0) > 0) return alert(`⚠️ ${c.nombre} tiene deuda.`);
    if ((c.fondo || 0) <= 0) return alert(`⚠️ ${c.nombre} no tiene fondo.`);
    const montoMaximo = c.fondo;
    const montoRetiro = prompt(`💰 RETIRAR FONDO\nCliente: ${c.nombre}\nFondo: RD$ ${montoMaximo}\n\n¿Cuánto retirar?`, montoMaximo);
    if (!montoRetiro) return;
    const monto = parseFloat(montoRetiro);
    if (isNaN(monto) || monto <= 0) return alert("Monto inválido");
    if (monto > montoMaximo) return alert(`Máximo RD$ ${montoMaximo}`);
    const nuevoFondo = (c.fondo || 0) - monto;
    db.ref('deudas').push({ clienteId, monto: -monto, concepto: "Retiro de fondo", fecha: new Date().toLocaleDateString('es-DO'), hora: new Date().toLocaleTimeString('es-DO'), timestamp: new Date().toISOString(), tipoOperacion: 'retiro_fondo' });
    db.ref(`clientes/${clienteId}`).update({ fondo: nuevoFondo, fechaActualizacion: new Date().toISOString() });
    alert(`✅ Retiro de RD$ ${monto}. Nuevo fondo: RD$ ${nuevoFondo}`);
    if(usuarioActual.rol === 'admin') cargarClientesAdmin(); else cargarClientesEmpleada();
};

// ========== GUARDAR DEUDA ==========
window.guardarDeuda = async function() {
    const cid = document.getElementById('deudaCliente').value;
    const tipo = document.getElementById('deudaTipo').value;
    const monto = parseFloat(document.getElementById('deudaMonto').value) || 0;
    const conc = document.getElementById('deudaConcepto').value || 'Venta Regular';
    if(!cid || monto <= 0) return alert("Ingrese datos correctos.");
    const c = clientes.find(cl => cl.id === cid);
    if (!c) return alert("Cliente no encontrado");
    let nuevaDeuda = c.deuda || 0;
    let nuevoFondo = c.fondo || 0;
    let mensaje = "";
    if (tipo === 'deuda') {
        if (nuevoFondo >= monto) {
            nuevoFondo -= monto;
            mensaje = `✅ Ticket de RD$ ${monto}. Descontado del FONDO. Nuevo fondo: RD$ ${nuevoFondo}`;
        } else {
            const resto = monto - nuevoFondo;
            nuevaDeuda += resto;
            mensaje = `✅ Ticket de RD$ ${monto}. Fondo usado: RD$ ${nuevoFondo}. Deuda agregada: RD$ ${resto}. Nueva deuda: RD$ ${nuevaDeuda}`;
            nuevoFondo = 0;
        }
    } else if (tipo === 'pago') {
        if (nuevaDeuda > 0) {
            if (monto >= nuevaDeuda) {
                const sobrante = monto - nuevaDeuda;
                nuevoFondo = Math.max(0, nuevoFondo - sobrante);
                mensaje = `✅ Deuda liquidada: RD$ ${nuevaDeuda}. ${sobrante > 0 ? `Sobrante RD$ ${sobrante}. Nuevo fondo: RD$ ${nuevoFondo}` : ''}`;
                nuevaDeuda = 0;
            } else {
                nuevaDeuda -= monto;
                mensaje = `✅ Cobro a deuda: -RD$ ${monto}. Deuda restante: RD$ ${nuevaDeuda}`;
            }
        } else {
            nuevoFondo = Math.max(0, nuevoFondo - monto);
            mensaje = `✅ Cobro al fondo: -RD$ ${monto}. Fondo restante: RD$ ${nuevoFondo}`;
        }
    }
    await db.ref('deudas').push({ clienteId: cid, monto: tipo === 'deuda' ? monto : -monto, concepto: conc, fecha: new Date().toLocaleDateString('es-DO'), hora: new Date().toLocaleTimeString('es-DO'), timestamp: new Date().toISOString(), tipoOperacion: tipo });
    await db.ref(`clientes/${cid}`).update({ deuda: nuevaDeuda, fondo: nuevoFondo, fechaActualizacion: new Date().toISOString() });
    alert(mensaje);
    cerrarModal('modalDeuda');
    if(usuarioActual.rol === 'admin') cargarClientesAdmin(); else cargarClientesEmpleada();
};

// ========== RECORDATORIO ==========
window.lanzarRecordatorioPago = function(id) {
    const c = clientes.find(cl => cl.id === id);
    if (!c) return;
    const diasMorosidad = calcularDiasMorosidad(c.fechaActualizacion);
    const deuda = c.deuda || 0;
    const fondo = c.fondo || 0;
    let mensajeMorosidad = '';
    if (diasMorosidad <= 2) mensajeMorosidad = `✅ Cliente al día. Último pago hace ${diasMorosidad} días.`;
    else if (diasMorosidad <= 7) mensajeMorosidad = `⚠️ ATENCIÓN: Tiene ${diasMorosidad} días sin actualizar.`;
    else mensajeMorosidad = `🔴 URGENTE: Tiene ${diasMorosidad} días sin pagos.`;
    const msg = `*🏦 BANCAS KIKO - RECORDATORIO DE PAGO* 🏦\n\nSaludos *${c.nombre}*,\n\n${mensajeMorosidad}\n\n💰 *BALANCE PENDIENTE:* RD$ ${deuda.toFixed(2)}\n💵 *FONDO DISPONIBLE:* RD$ ${fondo.toFixed(2)}\n\n📌 *DATOS PARA TRANSFERENCIA:*\n─────────────────────\n🏛 *BANRESERVAS* (Ahorro)\n👤 JUAN FRANCISCO LORENZO\n🔢 *4244961290*\n─────────────────────\n🏛 *BANCO POPULAR* (Corriente)\n👤 JUAN FRANCISCO LORENZO\n🔢 *846212900*\n─────────────────────\n\n📱 *ENVIAR COMPROBANTE* para confirmar.\n\n🙏 ¡Gracias por preferirnos!\n\n━━━━━━━━━━━━━━━━━━━━━\n🤖 Mensaje automático - BANCAS KIKO`;
    document.getElementById('recordatorioMensaje').value = msg;
    document.getElementById('recordatorioTelefono').value = c.whatsapp || '';
    abrirModal('modalRecordatorio');
};

// ========== ELIMINAR CLIENTE ==========
window.eliminarCliente = async function(clienteId, clienteNombre) {
    if(!confirm(`¿Eliminar al cliente "${clienteNombre}"?\n\n⚠️ Se eliminará TODO.`)) return;
    try {
        const deudasCliente = deudas.filter(d => d.clienteId === clienteId);
        for(let d of deudasCliente) await db.ref(`deudas/${d.id}`).remove();
        await db.ref(`clientes/${clienteId}`).remove();
        alert(`✅ Cliente "${clienteNombre}" eliminado`);
        if(usuarioActual.rol === 'admin') cargarClientesAdmin(); else cargarClientesEmpleada();
    } catch(error) { console.error(error); alert("Error al eliminar"); }
};

// ========== FICHA DETALLE ==========
window.abrirFichaDetalle = function(id, esAdmin) {
    if (!id || id === 'nuevo') {
        document.getElementById('clienteId').value = '';
        document.getElementById('clienteNombre').value = '';
        document.getElementById('clienteWhatsapp').value = '';
        document.getElementById('clienteBanca').value = usuarioActual?.banca || 'kiko1';
        document.getElementById('clienteDeuda').value = '0';
        document.getElementById('clienteFondo').value = '0';
        document.getElementById('historialTransaccionesCliente').innerHTML = '<p style="text-align:center; color:var(--text-muted);">Cliente nuevo - Sin historial</p>';
        const modalTitle = document.querySelector('#modalCliente .sheet-header h3');
        if(modalTitle) modalTitle.textContent = '➕ Nuevo Cliente';
        abrirModal('modalCliente');
        return;
    }
    const c = clientes.find(cl => cl.id === id);
    if (!c) return;
    const modalTitle = document.querySelector('#modalCliente .sheet-header h3');
    if(modalTitle) modalTitle.textContent = '👤 Ficha del Cliente';
    document.getElementById('clienteId').value = c.id;
    document.getElementById('clienteNombre').value = c.nombre || '';
    document.getElementById('clienteWhatsapp').value = c.whatsapp || '';
    document.getElementById('clienteBanca').value = c.banca || 'kiko1';
    document.getElementById('clienteDeuda').value = c.deuda || 0;
    document.getElementById('clienteFondo').value = c.fondo || 0;
    document.getElementById('historialTransaccionesCliente').innerHTML = `
        <div class="input-row" style="margin-bottom:8px;">
            <input type="date" id="historialClienteDesde" class="mobile-input" style="font-size:11px; padding:6px;">
            <input type="date" id="historialClienteHasta" class="mobile-input" style="font-size:11px; padding:6px;">
            <button class="mini-btn" onclick="filtrarHistorialCliente('${id}')">Filtrar</button>
        </div>
        <div id="historialClienteLista"></div>
    `;
    window.cargarHistorialCliente = function(clienteId) {
        let filtradas = deudas.filter(d => d.clienteId === clienteId);
        const desde = document.getElementById('historialClienteDesde')?.value;
        const hasta = document.getElementById('historialClienteHasta')?.value;
        if(desde) filtradas = filtradas.filter(f => new Date(f.fecha) >= new Date(desde));
        if(hasta) { const fh = new Date(hasta); fh.setHours(23,59,59); filtradas = filtradas.filter(f => new Date(f.fecha) <= fh); }
        filtradas.reverse();
        if(filtradas.length === 0) { document.getElementById('historialClienteLista').innerHTML = 'No hay registros.'; return; }
        let hHtml = '';
        filtradas.forEach(f => {
            const esTicket = f.monto > 0;
            const esDeposito = f.deposito > 0;
            if (esDeposito) {
                hHtml += `<div style="padding:4px 0; border-bottom:1px solid #e2e8f0;">• ${f.fecha || ''} | ${f.hora || ''} | 💰 Depósito: <b>RD$ ${f.deposito}</b> <span style="color:var(--text-muted); font-size:10px;">(${f.concepto || ''})</span></div>`;
            } else {
                hHtml += `<div style="padding:4px 0; border-bottom:1px solid #e2e8f0;">• ${f.fecha || ''} | ${f.hora || ''} | ${esTicket ? '🎫 Ticket' : '💰 Cobro'}: <b>RD$ ${Math.abs(f.monto)}</b> <span style="color:var(--text-muted); font-size:10px;">(${f.concepto || ''})</span></div>`;
            }
        });
        document.getElementById('historialClienteLista').innerHTML = hHtml;
    };
    window.filtrarHistorialCliente = function(clienteId) { cargarHistorialCliente(clienteId); };
    cargarHistorialCliente(id);
    abrirModal('modalCliente');
};

// ========== GUARDAR CLIENTE ==========
window.guardarCliente = async function() {
    const id = document.getElementById('clienteId').value;
    const nombre = document.getElementById('clienteNombre').value.trim();
    const whatsapp = document.getElementById('clienteWhatsapp').value.trim();
    const banca = document.getElementById('clienteBanca').value;
    const deuda = parseFloat(document.getElementById('clienteDeuda').value) || 0;
    const fondo = parseFloat(document.getElementById('clienteFondo').value) || 0;
    if(!nombre) return alert('El nombre es obligatorio');
    const datos = {
        nombre, whatsapp, banca, deuda, fondo,
        fechaActualizacion: new Date().toISOString()
    };
    try {
        if(!id) {
            datos.fechaCreacion = new Date().toISOString();
            await db.ref('clientes').push(datos);
            alert(`✅ Cliente "${nombre}" creado`);
        } else {
            await db.ref(`clientes/${id}`).update(datos);
            alert(`✅ Cliente "${nombre}" actualizado`);
        }
        cerrarModal('modalCliente');
        if(usuarioActual.rol === 'admin') cargarClientesAdmin(); else cargarClientesEmpleada();
    } catch(error) { console.error(error); alert("Error al guardar"); }
};

// ========== ABRIR COBRO/TICKET ==========
window.abrirCobroCliente = function(clienteId) {
    abrirFlujoTransaccion();
    setTimeout(() => {
        document.getElementById('deudaCliente').value = clienteId;
        document.getElementById('deudaTipo').value = 'pago';
        document.getElementById('deudaMonto').focus();
        actualizarInfoClientePreview();
    }, 100);
};

window.abrirTicketCliente = function(clienteId) {
    abrirFlujoTransaccion();
    setTimeout(() => {
        document.getElementById('deudaCliente').value = clienteId;
        document.getElementById('deudaTipo').value = 'deuda';
        document.getElementById('deudaMonto').focus();
        actualizarInfoClientePreview();
    }, 100);
};

function actualizarInfoClientePreview() {
    const clienteSelect = document.getElementById('deudaCliente');
    if (!clienteSelect) return;
    const selectedOption = clienteSelect.options[clienteSelect.selectedIndex];
    if (!selectedOption || !selectedOption.value) return;
    const deuda = parseFloat(selectedOption.getAttribute('data-deuda') || 0);
    const fondo = parseFloat(selectedOption.getAttribute('data-fondo') || 0);
    const infoDiv = document.getElementById('clienteInfoPreview');
    if(infoDiv) {
        infoDiv.innerHTML = `<div class="summary-box" style="font-size:11px; padding:8px; margin-bottom:8px; background:#f0fdf4;">
            📊 <strong>Resumen:</strong><br>
            💳 Deuda: RD$ ${deuda.toFixed(2)} ${deuda > 0 ? '⚠️' : '✅'}<br>
            💰 Fondo: RD$ ${fondo.toFixed(2)}
        </div>`;
    }
}

// ============================================================
// ========== REGISTRO EMPLEADA (PRÉSTAMOS) ==========
// ============================================================
window.cargarRegistroEmpleada = function() {
    if (!usuarioActual) return;
    document.getElementById('pageTitle').textContent = 'Registrar Préstamos';
    window.estoyEnCuadre = false;

    document.getElementById('contentArea').innerHTML = `
        <div class="mobile-card">
            <h3 style="font-size:14px; margin-bottom:12px; color:var(--azul-rey); font-weight:800;">➕ Nuevo Préstamo</h3>
            <select id="regTipo" class="mobile-input">
                <option value="prestamo_pinpo">🏦 Préstamo PINPO</option>
                <option value="prestamo_jesus">🏦 Préstamo JESÚS</option>
            </select>
            <label class="input-sublabel">📅 Fecha del Movimiento</label>
            <input type="date" id="regFecha" class="mobile-input" value="${new Date().toISOString().slice(0,10)}">
            <label class="input-sublabel">💰 Monto RD$</label>
            <input type="number" id="regMonto" class="mobile-input" placeholder="Monto">
            <label class="input-sublabel">📝 Nota / Descripción</label>
            <input type="text" id="regNota" class="mobile-input" placeholder="Nota">
            <button class="mobile-btn btn-primary-filled" onclick="guardarRegistroEmpleada()">✅ Guardar Registro</button>
        </div>
        <p style="font-weight:800; font-size:11px; margin:12px 0 6px; color:var(--texto-gris); text-transform:uppercase;">📋 Mis Préstamos Recientes</p>
        <div id="misRegistros"></div>
    `;
    renderMisRegistros();
};

function renderMisRegistros() {
    if (!usuarioActual) return;
    const bKey = usuarioActual.banca;
    const cont = document.getElementById('misRegistros');
    if (!cont) return;

    const misPrestamos = prestamos.filter(p => p.banca === bKey && p.registradoPor === usuarioActual.id).slice(0, 15);

    if (misPrestamos.length === 0) {
        cont.innerHTML = '<p style="text-align:center; padding:20px; color:var(--text-muted);">Sin registros aún.</p>';
        return;
    }

    let html = '';
    misPrestamos.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).forEach((r, i) => {
        html += `
            <div class="mobile-card">
                <div class="card-top">
                    <span class="card-title"><span class="card-index">#${i+1}</span>🏦 ${(r.tipoPrestamo || '').toUpperCase()}</span>
                    <span class="mobile-badge badge-success">RD$ ${r.monto.toFixed(2)}</span>
                </div>
                <p style="font-size:11px; color:var(--text-muted); margin-top:4px;">
                    ${r.nota || ''}<br>
                    📅 ${r.fecha} · ${r.hora || ''}
                </p>
                <div class="card-actions">
                    <button class="mini-btn mini-btn-danger" onclick="eliminarRegistroEmpleada('prestamos', '${r.id}')"><i class="fa-solid fa-trash"></i> Eliminar</button>
                </div>
            </div>
        `;
    });
    cont.innerHTML = html;
}

window.guardarRegistroEmpleada = async function() {
    if (!usuarioActual) return;
    const tipo = document.getElementById('regTipo').value;
    const fechaStr = document.getElementById('regFecha').value;
    const monto = parseFloat(document.getElementById('regMonto').value) || 0;
    const nota = document.getElementById('regNota').value.trim();
    if (monto <= 0) return alert('Ingrese un monto válido');
    if (!fechaStr) return alert('Seleccione una fecha');

    const fecha = new Date(fechaStr + 'T' + new Date().toTimeString().slice(0,8));
    const bKey = usuarioActual.banca;

    await db.ref('prestamos').push({
        banca: bKey,
        monto,
        nota: nota || 'Registro por empleada',
        tipoPrestamo: tipo === 'prestamo_pinpo' ? 'pinpo' : 'jesus',
        retirado: false,
        fecha: fecha.toLocaleDateString('es-DO'),
        hora: fecha.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' }),
        timestamp: fecha.toISOString(),
        registradoPor: usuarioActual.id,
        registradoPorNombre: usuarioActual.nombre
    });
    alert(`✅ Préstamo ${tipo === 'prestamo_pinpo' ? 'PINPO' : 'JESÚS'} registrado: RD$ ${monto}`);

    document.getElementById('regMonto').value = '';
    document.getElementById('regNota').value = '';
    renderMisRegistros();
};

window.eliminarRegistroEmpleada = async function(ruta, id) {
    if (!confirm('¿Eliminar este registro?')) return;
    await db.ref(`${ruta}/${id}`).remove();
    alert('Eliminado');
    renderMisRegistros();
};

// ============================================================
// ========== CUADRE (CON COMISIÓN Y RECARGAS JUNTAS) ==========
// ============================================================
window.cargarCalculadoraCuadre = function() {
    if (!usuarioActual) return;
    document.getElementById('pageTitle').textContent = 'Cuadre de Caja';
    window.estoyEnCuadre = true;
    const bKey = usuarioActual.banca;
    const fBanca = bancas[bKey]?.fondo || 0;
    const fTotalClientes = clientes.filter(c => c.banca === bKey).reduce((s,c) => s + (c.fondo || 0), 0);
    const dTotalClientes = clientes.filter(c => c.banca === bKey).reduce((s,c) => s + (c.deuda || 0), 0);
    const pTotal = prestamos.filter(p => p.banca === bKey && !p.retirado).reduce((s,p) => s + p.monto, 0);
    const cenTotal = cuadresCentral.filter(cc => cc.banca === bKey && !cc.retirado).reduce((s,cc) => s + cc.monto, 0);
    
    const calcCom = calcularComisionYRecargas(bKey);
    const comRecTotal = calcCom.totalGlobal;

    window.baseSumablesFijos = fBanca + fTotalClientes + pTotal + cenTotal + comRecTotal;

    let tablaBilletes = '';
    DENOMINACIONES.forEach(d => {
        tablaBilletes += `<tr>
            <td><strong>RD$ ${d}</strong></td>
            <td><input type="number" class="cash-input-qty" id="cash_${d}" value="0" min="0" oninput="calcularMatrizCuadre()"></td>
            <td style="text-align:right;">RD$ <span id="sub_${d}">0.00</span></td>
        </tr>`;
    });

    document.getElementById('contentArea').innerHTML = `
        <div class="summary-box" style="background:#fff; border-left: 4px solid var(--dorado);">
            <p style="font-weight:800; color:var(--azul-rey); font-size:10px;">📈 VARIABLES DE ENTRADA</p>
            <div id="cuadreResumenAutomatico" style="font-size:11px; margin-top:4px; color:var(--text-muted); line-height:1.6;">
                Base Banca: RD$ ${fBanca} | Depósitos: RD$ ${fTotalClientes}<br>
                Préstamos: RD$ ${pTotal} | <b style="color:var(--azul-rey);">Comisión y Recargas Ex.: RD$ ${comRecTotal.toFixed(2)}</b> | C. Central: RD$ ${cenTotal}
            </div>
            <div style="background:#f0f9ff; padding:8px; border-radius:8px; margin-top:8px; font-size:10px; line-height:1.5;">
                <b>📊 Desglose Comisión y Recargas:</b><br>
                💵 Comisiones: RD$ ${calcCom.totalComisionesManuales.toFixed(2)}<br>
                📱 Recargas/Serv: RD$ ${calcCom.totalRecargas.toFixed(2)}<br>
                🍽️ Gastos: RD$ ${calcCom.totalGastos.toFixed(2)}<br>
                ⚠️ Faltantes: RD$ ${calcCom.totalFaltantes.toFixed(2)}<br>
                <b style="color:var(--azul-rey);">TOTAL: RD$ ${calcCom.totalGlobal.toFixed(2)}</b>
            </div>
            <label class="input-sublabel" style="margin-top:8px;">➕ Monto de Venta del Día</label>
            <input type="number" id="cuadreMontoDia" class="mobile-input" value="0" oninput="calcularMatrizCuadre()">
            <label class="input-sublabel">➕ Pendientes por Pagar</label>
            <input type="number" id="cuadrePendientePagar" class="mobile-input" value="0" oninput="calcularMatrizCuadre()">
            <label class="input-sublabel" style="color:var(--azul-rey); font-weight:800;">📱🧾 Monto en Caja por Recargas y Servicios (lo que se está vendiendo)</label>
            <input type="number" id="cuadreRecargasManual" class="mobile-input" value="0" oninput="calcularMatrizCuadre()" style="border: 2px solid var(--dorado); background: #fffbeb;">
            <p style="font-size:10px; color:var(--text-muted); margin-top:4px; line-height:1.4;">
                💡 Aquí va lo que tienes en caja del día por recargas y servicios.<br>
                ⚠️ Ya está incluido en "Comisión y Recargas Ex." de arriba.
            </p>
        </div>

        <div class="summary-box" style="background:#fff; border-left: 4px solid var(--rojo);">
            <p style="font-weight:800; color:var(--rojo); font-size:10px;">📉 VARIABLES DE SALIDA</p>
            <label class="input-sublabel">➖ Deuda Total Clientes (Automático)</label>
            <input type="number" id="cuadreDeudaTotalRestable" class="mobile-input" value="${dTotalClientes}" readonly style="background:#f0f0f0; font-weight:bold;">
            <label class="input-sublabel">➖ Monto Total Deuda Lista</label>
            <input type="number" id="cuadredeudalista" class="mobile-input" value="0" oninput="calcularMatrizCuadre()">
            <label class="input-sublabel">➖ Monto de Pérdida Directa</label>
            <input type="number" id="cuadrePerdidaEntrada" class="mobile-input" value="0" oninput="calcularMatrizCuadre()">
        </div>

        <div class="mobile-card">
            <p style="font-weight:800; font-size:12px; margin-bottom:6px; color:var(--azul-rey);">💵 Desglose de Caja Física</p>
            <table class="cash-table">${tablaBilletes}</table>
            <div style="text-align:right; font-weight:900; padding-top:6px; color:var(--azul-rey);">Total Efectivo: RD$ <span id="lblTotalEfectivo">0.00</span></div>
        </div>

        <div id="resultadoCuadreBox" class="mobile-card" style="text-align:center;">
            <h2 id="lblDiferenciaCuadre" style="font-size:26px; font-weight:900;">RD$ 0.00</h2>
            <p id="lblEstadoCuadre" style="font-size:11px; font-weight:800;"></p>
        </div>

        <div style="display: flex; gap: 8px;">
            <button class="mobile-btn btn-warning-filled" onclick="copiarResultadoCuadre()">📋 Copiar</button>
            <button class="mobile-btn btn-whatsapp" onclick="enviarResultadoCuadreWhatsApp()">💬 WhatsApp</button>
        </div>
        <button class="mobile-btn btn-primary-filled" style="background:var(--azul-rey); font-size:13px;" onclick="enviarCuadreCentral()">
            <i class="fa-solid fa-paper-plane"></i> Enviar Cuadre a Central
        </button>
        <p style="font-size:10px; color:var(--text-muted); text-align:center; margin-top:10px;">⚠️ Al enviar a Central, el faltante se descontará de tu quincena Y de la comisión de la banca.</p>
    `;
    calcularMatrizCuadre();
};

window.recalcularTotalesCuadreEnVivo = function() {
    if (!window.estoyEnCuadre || !usuarioActual) return;
    const bKey = usuarioActual.banca;
    const fBanca = bancas[bKey]?.fondo || 0;
    const fTotalClientes = clientes.filter(c => c.banca === bKey).reduce((s,c) => s + (c.fondo || 0), 0);
    const dTotalClientes = clientes.filter(c => c.banca === bKey).reduce((s,c) => s + (c.deuda || 0), 0);
    const pTotal = prestamos.filter(p => p.banca === bKey && !p.retirado).reduce((s,p) => s + p.monto, 0);
    const cenTotal = cuadresCentral.filter(cc => cc.banca === bKey && !cc.retirado).reduce((s,cc) => s + cc.monto, 0);
    
    const calcCom = calcularComisionYRecargas(bKey);
    const comRecTotal = calcCom.totalGlobal;
    
    window.baseSumablesFijos = fBanca + fTotalClientes + pTotal + cenTotal + comRecTotal;

    const resumen = document.getElementById('cuadreResumenAutomatico');
    if (resumen) {
        resumen.innerHTML = `Base Banca: RD$ ${fBanca} | Depósitos: RD$ ${fTotalClientes}<br>Préstamos: RD$ ${pTotal} | <b style="color:var(--azul-rey);">Comisión y Recargas Ex.: RD$ ${comRecTotal.toFixed(2)}</b> | C. Central: RD$ ${cenTotal}`;
    }
    const inputDeudaTotal = document.getElementById('cuadreDeudaTotalRestable');
    if (inputDeudaTotal) inputDeudaTotal.value = dTotalClientes;
    calcularMatrizCuadre();
};

window.calcularMatrizCuadre = function() {
    let totalEfectivo = 0;
    DENOMINACIONES.forEach(d => {
        const el = document.getElementById(`cash_${d}`);
        const cant = el ? (parseFloat(el.value) || 0) : 0;
        const sub = cant * d;
        totalEfectivo += sub;
        const lblSub = document.getElementById(`sub_${d}`);
        if(lblSub) lblSub.textContent = sub.toFixed(2);
    });
    if(document.getElementById('lblTotalEfectivo')) document.getElementById('lblTotalEfectivo').textContent = totalEfectivo.toFixed(2);
    const montoDia = parseFloat(document.getElementById('cuadreMontoDia')?.value) || 0;
    const pendientePagar = parseFloat(document.getElementById('cuadrePendientePagar')?.value) || 0;
    const recargasManual = parseFloat(document.getElementById('cuadreRecargasManual')?.value) || 0;
    const deudaRestable = parseFloat(document.getElementById('cuadreDeudaTotalRestable')?.value) || 0;
    const deudaRestablelista = parseFloat(document.getElementById('cuadredeudalista')?.value) || 0;
    const perdidaEntrada = parseFloat(document.getElementById('cuadrePerdidaEntrada')?.value) || 0;
    window.recargasDiaManual = recargasManual;

    const objetivo = (window.baseSumablesFijos + montoDia + pendientePagar) - (deudaRestable + perdidaEntrada + deudaRestablelista);
    const diferencia = totalEfectivo - objetivo;
    const lblDif = document.getElementById('lblDiferenciaCuadre');
    const lblEst = document.getElementById('lblEstadoCuadre');
    const box = document.getElementById('resultadoCuadreBox');
    if(lblDif && lblEst && box) {
        lblDif.textContent = `RD$ ${diferencia.toFixed(2)}`;
        if(Math.abs(diferencia) < 1) { lblEst.textContent = "🟢 CUADRADA CORRECTAMENTE"; box.style.background = "#d1fae5"; window.estadoCuadreResultado = "CUADRADO OK"; }
        else if (diferencia > 0) { lblEst.textContent = `🔵 SOBRANTE: RD$ ${diferencia.toFixed(2)}`; box.style.background = "#e0f2fe"; window.estadoCuadreResultado = "SOBRANTE"; }
        else { lblEst.textContent = `🔴 FALTANTE: RD$ ${Math.abs(diferencia).toFixed(2)}`; box.style.background = "#fee2e2"; window.estadoCuadreResultado = "FALTANTE"; }
    }
    window.montoDiferenciaCalculada = diferencia;
    window.totalEfectivoCalculado = totalEfectivo;
};

window.copiarResultadoCuadre = function() {
    navigator.clipboard.writeText(generarTextoCuadre());
    alert('Resultado copiado');
};
window.enviarResultadoCuadreWhatsApp = function() {
    window.open(`https://wa.me/?text=${encodeURIComponent(generarTextoCuadre())}`, '_blank');
};
function generarTextoCuadre() {
    const ahora = new Date();
    const deudaRestable = parseFloat(document.getElementById('cuadreDeudaTotalRestable')?.value) || 0;
    return `📊 *CUADRE DE CAJA - ${usuarioActual.nombre.toUpperCase()}*\n📅 ${ahora.toLocaleDateString('es-DO')}\n⏰ ${ahora.toLocaleTimeString('es-DO')}\n💰 Total Efectivo: RD$ ${window.totalEfectivoCalculado.toFixed(2)}\n📉 Deuda Clientes: RD$ ${deudaRestable}\n📱🧾 Recargas/Servicios: RD$ ${window.recargasDiaManual}\n📈 Estado: ${window.estadoCuadreResultado}\n🔄 Diferencia: RD$ ${window.montoDiferenciaCalculada.toFixed(2)}\n---\nSistema Kiko App`;
}

window.enviarCuadreCentral = async function() {
    if (!usuarioActual) return;
    if (!confirm(`¿Enviar cuadre a Central?\n\nDiferencia: RD$ ${window.montoDiferenciaCalculada.toFixed(2)}\nEstado: ${window.estadoCuadreResultado}\n\n⚠️ Si hay FALTANTE, se descontará de tu quincena Y de la comisión de la banca.`)) return;

    const bKey = usuarioActual.banca;
    const deudaRestable = parseFloat(document.getElementById('cuadreDeudaTotalRestable')?.value) || 0;
    const hayFaltante = window.montoDiferenciaCalculada < 0;
    const faltante = hayFaltante ? Math.abs(window.montoDiferenciaCalculada) : 0;

    const cuadre = {
        banca: bKey,
        empleadaId: usuarioActual.id,
        empleadaNombre: usuarioActual.nombre,
        totalEfectivoCalculado: window.totalEfectivoCalculado,
        montoDiferenciaCalculada: window.montoDiferenciaCalculada,
        diferencia: window.montoDiferenciaCalculada,
        estado: window.estadoCuadreResultado,
        deudaClientes: deudaRestable,
        recargasDia: window.recargasDiaManual,
        fechaEnvio: new Date().toLocaleDateString('es-DO'),
        horaEnvio: new Date().toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' }),
        timestamp: new Date().toISOString(),
        descontarNomina: hayFaltante,
        faltanteNomina: faltante,
        revisado: false
    };

    const ref = await db.ref('cuadres_pendientes').push(cuadre);

    if (hayFaltante) {
        await db.ref('nominas').push({
            empleadaId: usuarioActual.id,
            empleadaNombre: usuarioActual.nombre,
            banca: bKey,
            tipo: 'descuento',
            monto: -faltante,
            nota: `Faltante en cuadre del ${cuadre.fechaEnvio} ${cuadre.horaEnvio}`,
            fecha: cuadre.fechaEnvio,
            timestamp: new Date().toISOString(),
            registradoPor: 'Sistema (auto)',
            cuadreId: ref.key
        });

        await db.ref('comisiones').push({
            banca: bKey,
            monto: -faltante,
            nota: `Faltante cuadre - ${usuarioActual.nombre}`,
            tipo: 'faltante_cuadre',
            cuadreId: ref.key,
            fecha: cuadre.fechaEnvio,
            hora: cuadre.horaEnvio,
            timestamp: new Date().toISOString(),
            retirado: false
        });
    }

    alert(`✅ Cuadre enviado a Central\n${hayFaltante ? `⚠️ Faltante de RD$ ${faltante.toFixed(2)} descontado de quincena Y comisión.` : '✅ Sin faltante.'}`);
    window.estoyEnCuadre = false;
    cargarPanelEmpleada();
};

// ========== AUXILIARES ==========
window.copiarMensajePortapapeles = function() {
    const txt = document.getElementById('recordatorioMensaje');
    if(txt) { txt.select(); navigator.clipboard.writeText(txt.value); alert('Copiado'); }
};
window.enviarRecordatorio = function() {
    const tel = document.getElementById('recordatorioTelefono').value;
    const txt = encodeURIComponent(document.getElementById('recordatorioMensaje').value);
    window.open(tel ? `https://wa.me/${tel}?text=${txt}` : `https://wa.me/?text=${txt}`, '_blank');
    cerrarModal('modalRecordatorio');
};
window.abrirFlujoTransaccion = function() {
    if (!usuarioActual) return;
    let opts = '';
    const filtrados = clientes.filter(c => c.banca === usuarioActual.banca);
    if(filtrados.length === 0) opts = '<option value="">No hay clientes</option>';
    else filtrados.forEach(c => { opts += `<option value="${c.id}" data-deuda="${c.deuda || 0}" data-fondo="${c.fondo || 0}">${c.nombre} (Deuda: RD$ ${c.deuda || 0} | Fondo: RD$ ${c.fondo || 0})</option>`; });
    document.getElementById('deudaCliente').innerHTML = opts;
    if (!document.getElementById('clienteInfoPreview')) {
        const modalContent = document.querySelector('#modalDeuda .sheet-content');
        if(modalContent) {
            const infoDiv = document.createElement('div');
            infoDiv.id = 'clienteInfoPreview';
            modalContent.insertBefore(infoDiv, modalContent.firstChild);
        }
    }
    const clienteSelect = document.getElementById('deudaCliente');
    if(clienteSelect) clienteSelect.onchange = function() { actualizarInfoClientePreview(); };
    abrirModal('modalDeuda');
    setTimeout(() => actualizarInfoClientePreview(), 100);
};

window.abrirModal = function(id) {
    const t = document.getElementById(id);
    if (t) {
        t.classList.remove('hidden');
        t.style.display = 'flex';
    }
};
window.cerrarModal = function(id) {
    const t = document.getElementById(id);
    if (t) {
        t.classList.add('hidden');
        t.style.display = 'none';
        setTimeout(() => { t.style.display = ''; }, 300);
    }
};

document.addEventListener("DOMContentLoaded", () => {
    const currentDateSpan = document.getElementById('currentDate');
    if(currentDateSpan) currentDateSpan.textContent = new Date().toLocaleDateString('es-DO');
    cargarDatosIniciales();
});
