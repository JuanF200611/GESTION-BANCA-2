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
let empleados = [];
let loterias = [];

let bancas = {
    kiko1: { nombre: 'Banca Kiko 1', fondo: 5000 },
    kiko2: { nombre: 'Banca Kiko 2', fondo: 5000 },
    kiko3: { nombre: 'Banca Kiko 3', fondo: 5000 }
};

const DENOMINACIONES = [2000, 1000, 500, 200, 100, 50, 25, 10, 5, 1];

window.baseSumablesFijos = 0;
window.estadoCuadreResultado = "FALTANTE";
window.montoDiferenciaCalculada = 0;
window.totalEfectivoCalculado = 0;
window.estoyEnCuadre = false;

// ========== INICIALIZACIÓN FIREBASE ==========
if (typeof firebase !== 'undefined') {
    if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
    db = firebase.database();
} else {
    alert("CRÍTICO: Las librerías de Firebase no se cargaron en el HTML.");
}

// ============================================================
// ========== MENÚ LATERAL (HAMBURGUESA) ==========
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
    const menuAvatar = document.getElementById('menuAvatar');

    if (!items || !usuarioActual) return;

    menuName.textContent = usuarioActual.nombre;
    menuRole.textContent = usuarioActual.rol === 'admin' ? 'Central Admin' : 'Empleada · ' + (bancas[usuarioActual.banca]?.nombre || '');
    menuAvatar.textContent = usuarioActual.avatar;

    let html = '';

    if (usuarioActual.rol === 'admin') {
        html += `
            <button class="menu-item" onclick="menuIr(this, cargarPanelAdmin)">
                <i class="fa-solid fa-shield-halved"></i>
                <span>Panel General</span>
            </button>
            <button class="menu-item" onclick="menuIr(this, cargarClientesAdmin)">
                <i class="fa-solid fa-users"></i>
                <span>Clientes</span>
            </button>
            <button class="menu-item" onclick="menuIr(this, cargarGestionEmpleados)">
                <i class="fa-solid fa-user-plus"></i>
                <span>Empleados</span>
            </button>
            <button class="menu-item" onclick="menuIr(this, cargarAnguilla)">
                <i class="fa-solid fa-tower-broadcast"></i>
                <span>Anguilla (Pizarra)</span>
            </button>
            <button class="menu-item" onclick="menuIr(this, cargarResultadosNuevo)">
                <i class="fa-solid fa-chart-simple"></i>
                <span>Resultados Loterías</span>
            </button>
            <button class="menu-item" onclick="menuIr(this, abrirHistorialCuadresAdmin)">
                <i class="fa-solid fa-clock-rotate-left"></i>
                <span>Historial</span>
            </button>
        `;
    } else {
        html += `
            <button class="menu-item" onclick="menuIr(this, cargarPanelEmpleada)">
                <i class="fa-solid fa-house-user"></i>
                <span>Inicio</span>
            </button>
            <button class="menu-item" onclick="menuIr(this, cargarClientesEmpleada)">
                <i class="fa-solid fa-street-view"></i>
                <span>Mis Clientes</span>
            </button>
            <button class="menu-item" onclick="menuIr(this, cargarCalculadoraCuadre)">
                <i class="fa-solid fa-calculator"></i>
                <span>Cuadrar Caja</span>
            </button>
            <button class="menu-item" onclick="menuIr(this, cargarResultadosNuevo)">
                <i class="fa-solid fa-chart-simple"></i>
                <span>Resultados Loterías</span>
            </button>
            <button class="menu-item" onclick="menuIr(this, cargarAnguilla)">
                <i class="fa-solid fa-tower-broadcast"></i>
                <span>Pizarra Anguilla</span>
            </button>
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
    if(!db) return;
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

        db.ref('empleados').on('value', snap => { 
            empleados = snap.exists() ? Object.entries(snap.val()).map(([k,v]) => ({id:k, ...v})) : [];
            if (usuarioActual && usuarioActual.rol === 'admin') cargarPanelAdmin();
        });

        db.ref('loterias').on('value', snap => {
            loterias = snap.exists() ? Object.entries(snap.val()).map(([k,v]) => ({id:k, ...v})) : [];
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
    const titulo = document.getElementById('pageTitle').textContent;
    if (titulo.includes('General') || titulo.includes('Admin') || titulo.includes('Central')) {
        cargarPanelAdmin();
    } else if (titulo.includes('Principal') || titulo.includes('Banca')) {
        cargarPanelEmpleada();
    } else if (titulo.includes('Clientes') || titulo.includes('Mis Clientes')) {
        if(usuarioActual.rol === 'admin') cargarClientesAdmin(); else cargarClientesEmpleada();
    } else if (titulo.includes('Caja') || titulo.includes('Cuadre')) {
        recalcularTotalesCuadreEnVivo();
    } else if (titulo.includes('Empleados')) {
        cargarGestionEmpleados();
    } else if (titulo.includes('Resultado')) {
        if (!document.getElementById('iframeResultados')) cargarResultadosNuevo();
    } else if (titulo.includes('Anguilla')) {
        // No recargar si ya está activo
    }
}

// ========== LOGIN ==========
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
    } else { alert('Clave maestra central inválida'); }
};

window.iniciarSesionEmpleado = function() {
    const u = document.getElementById('loginUsuario').value.trim().toLowerCase();
    const p = document.getElementById('loginPassword').value;
    const empleadoEncontrado = empleados.find(emp => emp.usuario === u && emp.password === p);
    if (empleadoEncontrado) {
        usuarioActual = { 
            id: empleadoEncontrado.id, 
            nombre: empleadoEncontrado.nombre, 
            rol: 'empleada', 
            banca: empleadoEncontrado.banca, 
            avatar: empleadoEncontrado.avatar || empleadoEncontrado.nombre.charAt(0).toUpperCase()
        };
        concluirLogin(cargarPanelEmpleada);
    } else {
        alert('Usuario o contraseña incorrectos. Contacte al administrador.');
    }
};

function concluirLogin(panelCallback) {
    cerrarModal('modalLogin');
    document.getElementById('userAvatarHeader').textContent = usuarioActual.avatar;
    construirMenuLateral();
    panelCallback();
}

window.cerrarSesion = function() {
    usuarioActual = null;
    window.estoyEnCuadre = false;
    document.getElementById('userAvatarHeader').textContent = '?';
    document.getElementById('pageTitle').textContent = 'Identificación...';
    document.getElementById('menuAvatar').textContent = '?';
    document.getElementById('menuUserName').textContent = 'Invitado';
    document.getElementById('menuUserRole').textContent = 'Sin sesión';
    document.getElementById('menuItems').innerHTML = '';
    cargarDatosIniciales();
};

// ============================================================
// ========== VISTA: ANGUILLA (PIZARRA) ==========
// ============================================================
window.cargarAnguilla = function() {
    if (!usuarioActual) return;
    document.getElementById('pageTitle').textContent = 'Pizarra Anguilla';
    window.estoyEnCuadre = false;

    document.getElementById('contentArea').innerHTML = `
        <div class="mobile-card" style="background: linear-gradient(135deg, #4f46e5, #6366f1); color: white; padding: 20px; margin-bottom: 14px;">
            <div style="display: flex; align-items: center; gap: 12px;">
                <div style="background: rgba(255,255,255,0.2); width: 52px; height: 52px; border-radius: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <i class="fa-solid fa-tower-broadcast" style="font-size: 24px;"></i>
                </div>
                <div>
                    <h2 style="font-size: 18px; font-weight: 800; margin-bottom: 2px;">PIZARRA ANGUILLA</h2>
                    <p style="font-size: 11px; opacity: 0.9;">Control de sorteos y anuncios</p>
                </div>
            </div>
        </div>

        <p style="font-weight:700; font-size:11px; color:var(--text-muted); margin:8px 4px; text-transform:uppercase;">🎯 Opciones Disponibles</p>

        <button class="mobile-card anguilla-menu-btn" onclick="abrirSubmenuAnguilla('resultados')" style="text-align:left; width:100%; border:none; cursor:pointer; display:flex; align-items:center; gap:14px; padding:16px;">
            <div style="background: linear-gradient(135deg, #ff7900, #e06a00); width:52px; height:52px; border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <i class="fa-solid fa-trophy" style="font-size:22px; color:#fff;"></i>
            </div>
            <div style="flex:1;">
                <h3 style="font-size:14px; font-weight:700; color:var(--text-main); margin-bottom:3px;">Colocar Resultados</h3>
                <p style="font-size:11px; color:var(--text-muted); line-height:1.3;">Ingresar los números ganadores del día y ver la vista previa</p>
            </div>
            <i class="fa-solid fa-chevron-right" style="color:var(--text-muted); font-size:14px;"></i>
        </button>

        <button class="mobile-card anguilla-menu-btn" onclick="abrirSubmenuAnguilla('anuncios')" style="text-align:left; width:100%; border:none; cursor:pointer; display:flex; align-items:center; gap:14px; padding:16px;">
            <div style="background: linear-gradient(135deg, #3b82f6, #2563eb); width:52px; height:52px; border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <i class="fa-solid fa-bullhorn" style="font-size:22px; color:#fff;"></i>
            </div>
            <div style="flex:1;">
                <h3 style="font-size:14px; font-weight:700; color:var(--text-main); margin-bottom:3px;">Cargar Anuncios</h3>
                <p style="font-size:11px; color:var(--text-muted); line-height:1.3;">Administrar la lista de anuncios que rotan en la pizarra</p>
            </div>
            <i class="fa-solid fa-chevron-right" style="color:var(--text-muted); font-size:14px;"></i>
        </button>

        <div class="summary-box" style="background:#eff6ff; border-color:#bfdbfe; margin-top:16px; font-size:11px; color:#1e40af; line-height:1.5;">
            <i class="fa-solid fa-circle-info"></i> <b>Nota:</b> Los cambios se guardan automáticamente en Firebase y se reflejan en la pizarra pública.
        </div>
    `;
};

window.abrirSubmenuAnguilla = function(tipo) {
    if (tipo === 'resultados') {
        document.getElementById('pageTitle').textContent = 'Colocar Resultados';
    } else if (tipo === 'anuncios') {
        document.getElementById('pageTitle').textContent = 'Cargar Anuncios';
    }

    document.getElementById('contentArea').innerHTML = `
        <div style="margin: -12px; padding: 0; height: calc(100vh - 68px - 60px); overflow: hidden;">
            <iframe 
                src="pizarra_admin.html?view=${tipo}" 
                style="width: 100%; height: 100%; border: none; display: block; background: transparent;"
                id="iframePizarra">
            </iframe>
        </div>
    `;
};

// ============================================================
// ========== VISTA: RESULTADOS (LOTERÍAS - KIKO) ==========
// ============================================================
window.cargarResultadosNuevo = function() {
    if (!usuarioActual) return;
    document.getElementById('pageTitle').textContent = 'Resultados de Loterías';
    window.estoyEnCuadre = false;

    document.getElementById('contentArea').innerHTML = `
        <div style="margin: -12px; padding: 0; height: calc(100vh - 68px - 60px); overflow: hidden;">
            <iframe 
                src="resultado.html" 
                style="width: 100%; height: 100%; border: none; display: block; background: transparent;"
                allow="clipboard-write"
                id="iframeResultados">
            </iframe>
        </div>
    `;
};

// ============================================================
// ========== GESTIÓN DE EMPLEADOS ==========
// ============================================================
window.cargarGestionEmpleados = function() {
    document.getElementById('pageTitle').textContent = 'Gestión de Empleados';
    window.estoyEnCuadre = false;
    let html = `
        <div class="mobile-card" style="margin-bottom:16px;">
            <h3 style="font-size:14px; margin-bottom:12px;">➕ Registrar Nueva Empleada</h3>
            <input type="text" id="nuevoEmpleadoNombre" class="mobile-input" placeholder="Nombre completo">
            <input type="text" id="nuevoEmpleadoUsuario" class="mobile-input" placeholder="Usuario (ej: maria1)">
            <input type="password" id="nuevoEmpleadoPassword" class="mobile-input" placeholder="Contraseña">
            <select id="nuevoEmpleadoBanca" class="mobile-input">
                <option value="kiko1">Banca Kiko 1</option>
                <option value="kiko2">Banca Kiko 2</option>
                <option value="kiko3">Banca Kiko 3</option>
            </select>
            <button class="mobile-btn btn-primary-filled" onclick="registrarEmpleado()">📝 Registrar Empleada</button>
        </div>
        <p style="font-weight:700; font-size:11px; margin:8px 0;">👥 Empleadas Registradas</p>
    `;
    
    if(empleados.length === 0) {
        html += '<p style="text-align:center; padding:20px; color:var(--text-muted);">No hay empleadas registradas.</p>';
    } else {
        empleados.forEach(emp => {
            html += `
                <div class="mobile-card">
                    <div class="card-top">
                        <span class="card-title">${emp.nombre}</span>
                        <span class="mobile-badge badge-info">${emp.banca === 'kiko1' ? 'Banca Kiko 1' : emp.banca === 'kiko2' ? 'Banca Kiko 2' : 'Banca Kiko 3'}</span>
                    </div>
                    <div class="card-row-data">
                        <div><label>Usuario</label><p>${emp.usuario}</p></div>
                        <div><label>Contraseña</label><p>••••••</p></div>
                    </div>
                    <div class="card-actions">
                        <button class="mini-btn mini-btn-danger" onclick="eliminarEmpleado('${emp.id}')"><i class="fa-solid fa-trash"></i> Eliminar</button>
                        <button class="mini-btn" onclick="resetearPasswordEmpleado('${emp.id}')"><i class="fa-solid fa-key"></i> Reset Pass</button>
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
    const banca = document.getElementById('nuevoEmpleadoBanca').value;
    if(!nombre || !usuario || !password) return alert('Complete todos los campos');
    if(empleados.some(emp => emp.usuario === usuario)) return alert('Este usuario ya está registrado');
    const nuevoEmpleado = {
        nombre, usuario, password, banca,
        avatar: nombre.charAt(0).toUpperCase(),
        fechaRegistro: new Date().toISOString(),
        activo: true
    };
    await db.ref('empleados').push(nuevoEmpleado);
    alert('Empleada registrada exitosamente');
    document.getElementById('nuevoEmpleadoNombre').value = '';
    document.getElementById('nuevoEmpleadoUsuario').value = '';
    document.getElementById('nuevoEmpleadoPassword').value = '';
    cargarGestionEmpleados();
};

window.eliminarEmpleado = async function(id) {
    if(!confirm('¿Seguro que deseas eliminar esta empleada?')) return;
    await db.ref(`empleados/${id}`).remove();
    alert('Empleada eliminada');
    cargarGestionEmpleados();
};

window.resetearPasswordEmpleado = async function(id) {
    const nuevaPass = prompt('Ingrese la nueva contraseña para la empleada:');
    if(nuevaPass && nuevaPass.length > 0) {
        await db.ref(`empleados/${id}`).update({ password: nuevaPass });
        alert('Contraseña actualizada');
        cargarGestionEmpleados();
    }
};

// ========== PANEL ADMIN ==========
window.cargarPanelAdmin = function() {
    document.getElementById('pageTitle').textContent = 'Panel Administrador';
    window.estoyEnCuadre = false;
    let html = `
        <div class="mobile-grid-stats" style="grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 12px;">
            <button class="mobile-btn btn-primary-filled" style="margin:0; padding:12px 4px; font-size:12px;" onclick="abrirModalRegistrar('prestamo')"><i class="fa-solid fa-plus-circle"></i> + Préstamo</button>
            <button class="mobile-btn btn-warning-filled" style="margin:0; padding:12px 4px; font-size:12px;" onclick="abrirModalRetirar('prestamo')"><i class="fa-solid fa-minus-circle"></i> - Retirar Préstamo</button>
            <button class="mobile-btn btn-primary-filled" style="margin:0; padding:12px 4px; font-size:12px; background:#10b981;" onclick="abrirModalRegistrar('comision')"><i class="fa-solid fa-plus-circle"></i> + Comisión</button>
            <button class="mobile-btn btn-warning-filled" style="margin:0; padding:12px 4px; font-size:12px;" onclick="abrirModalRetirar('comision')"><i class="fa-solid fa-minus-circle"></i> - Retirar Comisión</button>
            <button class="mobile-btn btn-primary-filled" style="margin:0; padding:12px 4px; font-size:12px; background:#6b7280;" onclick="abrirModalRegistrar('central')"><i class="fa-solid fa-plus-circle"></i> + C. Central</button>
            <button class="mobile-btn btn-warning-filled" style="margin:0; padding:12px 4px; font-size:12px;" onclick="abrirModalRetirar('central')"><i class="fa-solid fa-minus-circle"></i> - Retirar C. Central</button>
        </div>
        <p style="font-weight:700; font-size:11px; color:var(--text-muted); margin:12px 0 6px; text-transform:uppercase;">📊 Estado de Cuentas por Bancas</p>
    `;
    for (let [key, b] of Object.entries(bancas)) {
        const misCuadresPend = cuadresPendientes.filter(cp => cp.banca === key);
        const pTotal = prestamos.filter(p => p.banca === key && !p.retirado).reduce((s,p) => s + p.monto, 0);
        const comTotal = comisiones.filter(c => c.banca === key && !c.retirado).reduce((s,c) => s + c.monto, 0);
        const cenTotal = cuadresCentral.filter(cc => cc.banca === key && !cc.retirado).reduce((s,cc) => s + cc.monto, 0);
        html += `
            <div class="mobile-card">
                <div class="card-top"><strong>${b.nombre}</strong> <span class="mobile-badge badge-success">Base: RD$ ${b.fondo}</span></div>
                <div class="card-row-data" style="grid-template-columns: repeat(3, 1fr); padding:6px; gap:4px;">
                    <div><label>Préstamos</label><p style="font-size:11px;">RD$ ${pTotal}</p></div>
                    <div><label>Comisión</label><p style="font-size:11px;">RD$ ${comTotal}</p></div>
                    <div><label>C. Central</label><p style="font-size:11px;">RD$ ${cenTotal}</p></div>
                </div>
                <div class="summary-box" style="margin-bottom:8px; background:#f1f5f9; font-size:11px;">
                    <b>📋 Cuadres pendientes:</b> ${misCuadresPend.length}
                </div>
                <button class="mobile-btn btn-success-filled" style="padding:8px; font-size:11px;" onclick="limpiarCuadresPendientes('${key}')">🧹 Limpiar Cuadres Pendientes</button>
                <button class="mobile-btn btn-danger" style="padding:8px; font-size:11px; margin-top:6px; background:#ef4444;" onclick="limpiarHistorialCompletoBanca('${key}')">🗑️ Limpiar Historial Antiguo</button>
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
        timestamp: ahora.toISOString(),
        fechaOriginal: fechaPersonalizada || null
    };
    if(tipo === 'prestamo') {
        datos.tipoPrestamo = tipoPrestamo;
        await db.ref('prestamos').push(datos);
        alert(`Préstamo ${tipoPrestamo.toUpperCase()} registrado`);
    }
    if(tipo === 'comision') {
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
        options += `<option value="${item.id}">${item.banca.toUpperCase()}${tipoLabel} - RD$ ${item.monto} (${item.fecha} ${item.hora})</option>`;
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
        fechaRetiro: fechaRetiro.toISOString(),
        fechaRetiroStr: fechaRetiro.toLocaleDateString('es-DO'),
        horaRetiroStr: fechaRetiro.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })
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
    if(hasta) {
        const fh = new Date(hasta); fh.setHours(23,59,59);
        historialFiltrado = historialFiltrado.filter(h => new Date(h.fechaCierre || h.fecha) <= fh);
    }
    historialFiltrado.reverse();
    if(historialFiltrado.length === 0) {
        document.getElementById('historialLista').innerHTML = '<p style="text-align:center; padding:30px; color:var(--text-muted);">No hay registros.</p>';
        return;
    }
    let html = '';
    historialFiltrado.forEach(c => {
        html += `
            <div class="mobile-card">
                <div class="card-top"><strong>${c.banca?.toUpperCase() || 'N/A'}</strong> <span class="mobile-badge badge-danger">${c.estado || 'ARCHIVADO'}</span></div>
                <p style="font-size:12px; line-height:1.4;"><b>Operadora:</b> ${c.empleada || 'Desconocida'}<br>
                <b>Efectivo:</b> RD$ ${c.totalEfectivoCalculado || 0} | <b>Diferencia:</b> ${c.diferencia || 0}<br>
                <b>Fecha:</b> ${c.fechaCierre || c.fecha || ''}</p>
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

// ========== VISTA EMPLEADA ==========
window.cargarPanelEmpleada = function() {
    if (!usuarioActual) return;
    document.getElementById('pageTitle').textContent = 'Mi Banca';
    window.estoyEnCuadre = false;
    const bKey = usuarioActual.banca;
    const misClientes = clientes.filter(c => c.banca === bKey);
    const fTotalClientes = misClientes.reduce((s,c) => s + (c.fondo || 0), 0);
    const dTotalClientes = misClientes.reduce((s,c) => s + (c.deuda || 0), 0);
    const fBanca = bancas[bKey]?.fondo || 0;
    const pPinpo = prestamos.filter(p => p.banca === bKey && !p.retirado && p.tipoPrestamo === 'pinpo').reduce((s,p) => s + p.monto, 0);
    const pJesus = prestamos.filter(p => p.banca === bKey && !p.retirado && p.tipoPrestamo === 'jesus').reduce((s,p) => s + p.monto, 0);
    const comTotal = comisiones.filter(c => c.banca === bKey && !c.retirado).reduce((s,c) => s + c.monto, 0);
    const cenTotal = cuadresCentral.filter(cc => cc.banca === bKey && !cc.retirado).reduce((s,cc) => s + cc.monto, 0);
    const cPendientes = cuadresPendientes.filter(cp => cp.banca === bKey).length;

    document.getElementById('contentArea').innerHTML = `
        <div class="mobile-card" style="background: linear-gradient(135deg, #4f46e5, #6366f1); color: white; margin-bottom:8px;">
            <label style="font-size:10px; opacity:0.8; font-weight:700; text-transform:uppercase;">💰 Fondo Total Clientes</label>
            <h2 style="font-size:24px; font-weight:800;">RD$ ${fTotalClientes.toFixed(2)}</h2>
        </div>
        <div class="mobile-grid-stats">
            <div class="stat-box-app"><h4>Fondo Base Banca</h4><p>RD$ ${fBanca}</p></div>
            <div class="stat-box-app" style="border-left: 3px solid var(--danger);"><h4>Deuda Total Clientes</h4><p style="color:var(--danger)">RD$ ${dTotalClientes.toFixed(2)}</p></div>
        </div>
        <p style="font-weight:700; font-size:11px; color:var(--text-muted); margin:10px 0 4px;">📊 Préstamos Activos</p>
        <div class="mobile-grid-stats" style="grid-template-columns: repeat(2, 1fr);">
            <div class="stat-box-app" style="padding:10px 6px;"><h4>Préstamo PINPO</h4><p style="font-size:12px;">RD$ ${pPinpo}</p></div>
            <div class="stat-box-app" style="padding:10px 6px;"><h4>Préstamo JESÚS</h4><p style="font-size:12px;">RD$ ${pJesus}</p></div>
        </div>
        <div class="mobile-grid-stats" style="grid-template-columns: repeat(2, 1fr);">
            <div class="stat-box-app" style="padding:10px 6px;"><h4>Comisiones</h4><p style="font-size:12px;">RD$ ${comTotal}</p></div>
            <div class="stat-box-app" style="padding:10px 6px;"><h4>C. Central</h4><p style="font-size:12px;">RD$ ${cenTotal}</p></div>
        </div>
        <div class="summary-box" style="background:#fff3cd; color:#856404; font-size:11px;">
            📌 <b>Cuadres enviados:</b> ${cPendientes} esperando revisión.
        </div>
        <button class="mobile-btn btn-success-filled" onclick="abrirFlujoTransaccion()"><i class="fa-solid fa-square-plus"></i> Ticket / Cobro / Depositar</button>
    `;
};

function calcularDiasMorosidad(fechaActualizacion) {
    if (!fechaActualizacion) return 99;
    const diffTime = Math.abs(new Date() - new Date(fechaActualizacion));
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function renderListaClientesMovil(lista, esAdmin) {
    document.getElementById('pageTitle').textContent = 'Mis Clientes';
    window.estoyEnCuadre = false;
    let html = `<button class="mobile-btn btn-primary-filled" style="margin-bottom:12px;" onclick="abrirFichaDetalle('nuevo', ${esAdmin})"><i class="fa-solid fa-user-plus"></i> + Nuevo Cliente</button>`;
    if(lista.length === 0) html += '<p style="text-align:center; padding:20px; color:var(--text-muted);">No hay clientes registrados.</p>';
    lista.forEach(c => {
        const diasMorosidad = calcularDiasMorosidad(c.fechaActualizacion);
        let estadoTexto = '', estadoColor = '';
        if (diasMorosidad <= 2) { estadoTexto = '✅ Al Día'; estadoColor = 'badge-success'; }
        else if (diasMorosidad <= 7) { estadoTexto = `⚠️ Aviso (${diasMorosidad} días)`; estadoColor = 'badge-warning'; }
        else { estadoTexto = `🔴 Moroso (${diasMorosidad} días)`; estadoColor = 'badge-danger'; }
        html += `
            <div class="mobile-card ${diasMorosidad > 2 ? 'moroso-card' : ''}">
                <div class="card-top">
                    <span class="card-title">${c.nombre}</span>
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
                    ${esAdmin ? `<button class="mini-btn mini-btn-danger" onclick="limpiarHistorialCliente('${c.id}', '${c.nombre}')"><i class="fa-solid fa-trash"></i> Limpiar Hist.</button>` : ''}
                    ${esAdmin ? `<button class="mini-btn mini-btn-danger" onclick="eliminarCliente('${c.id}', '${c.nombre}')"><i class="fa-solid fa-trash"></i> Eliminar</button>` : ''}
                </div>
            </div>
        `;
    });
    document.getElementById('contentArea').innerHTML = html;
}

window.cargarClientesAdmin = function() { renderListaClientesMovil(clientes, true); };
window.cargarClientesEmpleada = function() { 
    if (!usuarioActual) return;
    renderListaClientesMovil(clientes.filter(c => c.banca === usuarioActual.banca), false); 
};

// ========== FONDOS ==========
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
    if ((c.deuda || 0) > 0) return alert(`⚠️ ${c.nombre} tiene deuda de RD$ ${c.deuda}. Debe pagar antes de retirar.`);
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
                mensaje = `✅ Deuda liquidada: RD$ ${nuevaDeuda}. ${sobrante > 0 ? `Sobrante RD$ ${sobrante} del fondo. Nuevo fondo: RD$ ${nuevoFondo}` : ''}`;
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
        fechaActualizacion: new Date().toISOString(),
        fechaCreacion: id ? undefined : new Date().toISOString()
    };
    try {
        if(!id) {
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

// ========== CUADRE CON TIEMPO REAL ==========
window.cargarCalculadoraCuadre = function() {
    if (!usuarioActual) return;
    document.getElementById('pageTitle').textContent = 'Cuadre de Caja';
    window.estoyEnCuadre = true;
    const bKey = usuarioActual.banca;
    const fBanca = bancas[bKey]?.fondo || 0;
    const fTotalClientes = clientes.filter(c => c.banca === bKey).reduce((s,c) => s + (c.fondo || 0), 0);
    const dTotalClientes = clientes.filter(c => c.banca === bKey).reduce((s,c) => s + (c.deuda || 0), 0);
    const pTotal = prestamos.filter(p => p.banca === bKey && !p.retirado).reduce((s,p) => s + p.monto, 0);
    const comTotal = comisiones.filter(c => c.banca === bKey && !c.retirado).reduce((s,c) => s + c.monto, 0);
    const cenTotal = cuadresCentral.filter(cc => cc.banca === bKey && !cc.retirado).reduce((s,cc) => s + cc.monto, 0);
    window.baseSumablesFijos = fBanca + fTotalClientes + pTotal + comTotal + cenTotal;

    let tablaBilletes = '';
    DENOMINACIONES.forEach(d => {
        tablaBilletes += `<tr>
            <td><strong>RD$ ${d}</strong></td>
            <td><input type="number" class="cash-input-qty" id="cash_${d}" value="0" min="0" oninput="calcularMatrizCuadre()"></td>
            <td style="text-align:right;">RD$ <span id="sub_${d}">0.00</span></td>
        </tr>`;
    });

    document.getElementById('contentArea').innerHTML = `
        <div class="summary-box" style="background:#fff;">
            <p style="font-weight:700; color:var(--primary); font-size:10px;">📈 VARIABLES DE ENTRADA</p>
            <div id="cuadreResumenAutomatico" style="font-size:11px; margin-top:2px; color:var(--text-muted);">
                Base Banca: RD$ ${fBanca} | Depósitos Clientes: RD$ ${fTotalClientes}<br>
                Préstamos: RD$ ${pTotal} | Comisión: RD$ ${comTotal} | C. Central: RD$ ${cenTotal}
            </div>
            <label class="input-sublabel" style="margin-top:8px;">➕ Monto de Venta del Día</label>
            <input type="number" id="cuadreMontoDia" class="mobile-input" value="0" oninput="calcularMatrizCuadre()">
            <label class="input-sublabel">➕ Pendientes por Pagar</label>
            <input type="number" id="cuadrePendientePagar" class="mobile-input" value="0" oninput="calcularMatrizCuadre()">
        </div>
        <div class="summary-box" style="background:#fff;">
            <p style="font-weight:700; color:var(--danger); font-size:10px;">📉 VARIABLES DE SALIDA</p>
            <label class="input-sublabel">➖ Deuda Total de Clientes (Automático)</label>
            <input type="number" id="cuadreDeudaTotalRestable" class="mobile-input" value="${dTotalClientes}" readonly style="background:#f0f0f0; font-weight:bold;">
            <label class="input-sublabel">➖ Monto Total Deuda Lista</label>
            <input type="number" id="cuadredeudalista" class="mobile-input" value="0" oninput="calcularMatrizCuadre()">
            <label class="input-sublabel">➖ Monto de Pérdida Directa</label>
            <input type="number" id="cuadrePerdidaEntrada" class="mobile-input" value="0" oninput="calcularMatrizCuadre()">
        </div>
        <div class="mobile-card">
            <p style="font-weight:700; font-size:12px; margin-bottom:6px;">💵 Desglose de Caja Física</p>
            <table class="cash-table">${tablaBilletes}</table>
            <div style="text-align:right; font-weight:800; padding-top:6px;">Total Efectivo: RD$ <span id="lblTotalEfectivo">0.00</span></div>
        </div>
        <div id="resultadoCuadreBox" class="mobile-card" style="text-align:center;">
            <h2 id="lblDiferenciaCuadre">RD$ 0.00</h2>
            <p id="lblEstadoCuadre" style="font-size:11px; font-weight:700;"></p>
        </div>
        <div style="display: flex; gap: 8px;">
            <button class="mobile-btn btn-warning-filled" onclick="copiarResultadoCuadre()">📋 Copiar</button>
            <button class="mobile-btn btn-whatsapp" onclick="enviarResultadoCuadreWhatsApp()">💬 WhatsApp</button>
        </div>
        <p style="font-size:10px; color:var(--text-muted); text-align:center; margin-top:10px;">⚠️ VISTA PREVIA. La Deuda Clientes se carga automáticamente.</p>
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
    const comTotal = comisiones.filter(c => c.banca === bKey && !c.retirado).reduce((s,c) => s + c.monto, 0);
    const cenTotal = cuadresCentral.filter(cc => cc.banca === bKey && !cc.retirado).reduce((s,cc) => s + cc.monto, 0);
    window.baseSumablesFijos = fBanca + fTotalClientes + pTotal + comTotal + cenTotal;
    const resumen = document.getElementById('cuadreResumenAutomatico');
    if (resumen) {
        resumen.innerHTML = `Base Banca: RD$ ${fBanca} | Depósitos Clientes: RD$ ${fTotalClientes}<br>Préstamos: RD$ ${pTotal} | Comisión: RD$ ${comTotal} | C. Central: RD$ ${cenTotal}`;
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
    const deudaRestable = parseFloat(document.getElementById('cuadreDeudaTotalRestable')?.value) || 0;
    const deudaRestablelista = parseFloat(document.getElementById('cuadredeudalista')?.value) || 0;
    const perdidaEntrada = parseFloat(document.getElementById('cuadrePerdidaEntrada')?.value) || 0;
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
    return `📊 *CUADRE DE CAJA - ${usuarioActual.nombre.toUpperCase()}*\n📅 ${ahora.toLocaleDateString('es-DO')}\n⏰ ${ahora.toLocaleTimeString('es-DO')}\n💰 Total Efectivo: RD$ ${window.totalEfectivoCalculado.toFixed(2)}\n📉 Deuda Clientes: RD$ ${deudaRestable}\n📈 Estado: ${window.estadoCuadreResultado}\n🔄 Diferencia: RD$ ${window.montoDiferenciaCalculada.toFixed(2)}\n---\nSistema Kiko App`;
}

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
window.abrirModal = id => { const t = document.getElementById(id); if(t) t.classList.remove('hidden'); };
window.cerrarModal = id => { const t = document.getElementById(id); if(t) t.classList.add('hidden'); };

document.addEventListener("DOMContentLoaded", () => {
    const currentDateSpan = document.getElementById('currentDate');
    if(currentDateSpan) currentDateSpan.textContent = new Date().toLocaleDateString('es-DO');
    cargarDatosIniciales();
});
