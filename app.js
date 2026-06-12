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

// Variables globales para la matriz de cálculo
window.baseSumablesFijos = 0;
window.estadoCuadreResultado = "FALTANTE";
window.montoDiferenciaCalculada = 0;
window.totalEfectivoCalculado = 0;

// Inicialización segura de Firebase
if (typeof firebase !== 'undefined') {
    if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
    db = firebase.database();
} else {
    alert("CRÍTICO: Las librerías de Firebase no se cargaron en el HTML. Verifica tu conexión a internet.");
}

// ========== CARGA GLOBAL DE NODOS ==========
function cargarDatosIniciales() {
    if(!db) return;
    try {
        db.ref('deudas').on('value', snap => { deudas = snap.exists() ? Object.entries(snap.val()).map(([k,v]) => ({id:k, ...v})) : []; });
        db.ref('fondos_bancas').on('value', snap => { if(snap.exists()) bancas = snap.val(); });
        db.ref('prestamos').on('value', snap => { prestamos = snap.exists() ? Object.entries(snap.val()).map(([k,v]) => ({id:k, ...v})) : []; });
        db.ref('comisiones').on('value', snap => { comisiones = snap.exists() ? Object.entries(snap.val()).map(([k,v]) => ({id:k, ...v})) : []; });
        db.ref('cuadres_central').on('value', snap => { cuadresCentral = snap.exists() ? Object.entries(snap.val()).map(([k,v]) => ({id:k, ...v})) : []; });
        db.ref('cuadres_pendientes').on('value', snap => { cuadresPendientes = snap.exists() ? Object.entries(snap.val()).map(([k,v]) => ({id:k, ...v})) : []; });
        db.ref('cuadres_historial').on('value', snap => { cuadresHistorial = snap.exists() ? Object.entries(snap.val()).map(([k,v]) => ({id:k, ...v})) : []; });
        db.ref('empleados').on('value', snap => { 
            empleados = snap.exists() ? Object.entries(snap.val()).map(([k,v]) => ({id:k, ...v})) : [];
            if (usuarioActual && usuarioActual.rol === 'admin') cargarPanelAdmin();
        });
        db.ref('loterias').on('value', snap => {
            loterias = snap.exists() ? Object.entries(snap.val()).map(([k,v]) => ({id:k, ...v})) : [];
            if (usuarioActual && document.getElementById('pageTitle').textContent.includes('Lotería')) {
                cargarGestionLoteria();
            }
        });

        db.ref('clientes').on('value', snap => {
            clientes = snap.exists() ? Object.entries(snap.val()).map(([k,v]) => ({id:k, ...v})) : [];
            if (usuarioActual) refrescarPantallaActiva();
        });

        document.getElementById('contentArea').innerHTML = `
            <div style="text-align:center; padding:70px 20px; color:var(--text-muted);">
                <i class="fa-solid fa-user-lock" style="font-size:48px; color:var(--primary); margin-bottom:14px;"></i>
                <p style="font-weight:700; color:var(--text-main);">Por favor Inicie Sesión</p>
                <p style="font-size:11px; margin-top:4px;">Cada empleada debe loguearse con sus datos.</p>
            </div>
        `;
        abrirModal('modalLogin');
    } catch(e) { console.error("Error al sincronizar base de datos: ", e); }
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
        cargarCalculadoraCuadre();
    } else if (titulo.includes('Empleados')) {
        cargarGestionEmpleados();
    } else if (titulo.includes('Lotería')) {
        cargarGestionLoteria();
    }
}

// ========== MANEJO DE INICIO DE SESIÓN ==========
window.switchLoginTab = function(tipo) {
    const btnEmpleado = document.getElementById('btnTabEmpleado');
    const btnAdmin = document.getElementById('btnTabAdmin');
    const loginEmpleado = document.getElementById('loginEmpleadoForm');
    const loginAdmin = document.getElementById('loginAdminForm');
    
    if(btnEmpleado) btnEmpleado.classList.toggle('active', tipo === 'empleada');
    if(btnAdmin) btnAdmin.classList.toggle('active', tipo === 'admin');
    if(loginEmpleado) loginEmpleado.classList.toggle('hidden-pane', tipo !== 'empleada');
    if(loginAdmin) loginAdmin.classList.toggle('hidden-pane', tipo !== 'admin');
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
    const avatarHeader = document.getElementById('userAvatarHeader');
    if(avatarHeader) avatarHeader.textContent = usuarioActual.avatar;
    construirMenuInferior();
    panelCallback();
}

window.cerrarSesion = function() {
    usuarioActual = null;
    const bottomNav = document.getElementById('bottomNav');
    const avatarHeader = document.getElementById('userAvatarHeader');
    const pageTitle = document.getElementById('pageTitle');
    if(bottomNav) bottomNav.innerHTML = '';
    if(avatarHeader) avatarHeader.textContent = '?';
    if(pageTitle) pageTitle.textContent = 'Identificación...';
    cargarDatosIniciales();
};

function construirMenuInferior() {
    const nav = document.getElementById('bottomNav');
    if (!nav) return;
    
    if (usuarioActual.rol === 'admin') {
        nav.innerHTML = `
            <button onclick="navCambiarVista(this, cargarPanelAdmin)" class="nav-button-item active-nav"><i class="fa-solid fa-shield-halved"></i><span>General</span></button>
            <button onclick="navCambiarVista(this, cargarClientesAdmin)" class="nav-button-item"><i class="fa-solid fa-users"></i><span>Clientes</span></button>
            <button onclick="navCambiarVista(this, cargarGestionEmpleados)" class="nav-button-item"><i class="fa-solid fa-user-plus"></i><span>Empleados</span></button>
            <button onclick="navCambiarVista(this, cargarGestionLoteria)" class="nav-button-item"><i class="fa-solid fa-ticket"></i><span>Lotería</span></button>
            <button onclick="navCambiarVista(this, abrirHistorialCuadresAdmin)" class="nav-button-item"><i class="fa-solid fa-clock-rotate-left"></i><span>Historial</span></button>
        `;
    } else {
        nav.innerHTML = `
            <button onclick="navCambiarVista(this, cargarPanelEmpleada)" class="nav-button-item active-nav"><i class="fa-solid fa-house-user"></i><span>Inicio</span></button>
            <button onclick="navCambiarVista(this, cargarClientesEmpleada)" class="nav-button-item"><i class="fa-solid fa-street-view"></i><span>Mis Clientes</span></button>
            <button onclick="navCambiarVista(this, cargarCalculadoraCuadre)" class="nav-button-item"><i class="fa-solid fa-calculator"></i><span>Cuadrar</span></button>
            <button onclick="navCambiarVista(this, cargarGestionLoteria)" class="nav-button-item"><i class="fa-solid fa-ticket"></i><span>Lotería</span></button>
        `;
    }
    
    const btns = document.querySelectorAll('.nav-button-item');
    const ancho = usuarioActual.rol === 'admin' ? '20%' : '25%';
    btns.forEach(btn => btn.style.width = ancho);
}

window.navCambiarVista = function(btn, callback) {
    document.querySelectorAll('.nav-button-item').forEach(b => b.classList.remove('active-nav'));
    btn.classList.add('active-nav');
    callback();
};

// ========== GESTIÓN DE EMPLEADOS (SOLO ADMIN) ==========
window.cargarGestionEmpleados = function() {
    document.getElementById('pageTitle').textContent = 'Gestión de Empleados';
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
    
    if(!nombre || !usuario || !password) {
        return alert('Complete todos los campos');
    }
    
    if(empleados.some(emp => emp.usuario === usuario)) {
        return alert('Este usuario ya está registrado');
    }
    
    const nuevoEmpleado = {
        nombre: nombre,
        usuario: usuario,
        password: password,
        banca: banca,
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

// ========== PANEL ADMIN - REGISTRAR Y RETIRAR ==========
window.cargarPanelAdmin = function() {
    document.getElementById('pageTitle').textContent = 'Panel Administrador';
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
    
    if(!confirm(`¿Limpiar historial ANTIGUO (más de 30 días) de ${bancaKey}? Los montos actuales NO se afectan.`)) return;
    
    const prestamosAntiguos = prestamos.filter(p => p.banca === bancaKey && p.retirado && new Date(p.fechaRetiro) < fechaLimite);
    for(let p of prestamosAntiguos) {
        await db.ref(`prestamos/${p.id}`).remove();
    }
    
    const comisionesAntiguas = comisiones.filter(c => c.banca === bancaKey && c.retirado && new Date(c.fechaRetiro) < fechaLimite);
    for(let c of comisionesAntiguas) {
        await db.ref(`comisiones/${c.id}`).remove();
    }
    
    const centralAntiguos = cuadresCentral.filter(cc => cc.banca === bancaKey && cc.retirado && new Date(cc.fechaRetiro) < fechaLimite);
    for(let cc of centralAntiguos) {
        await db.ref(`cuadres_central/${cc.id}`).remove();
    }
    
    const historialAntiguo = cuadresHistorial.filter(h => h.banca === bancaKey && new Date(h.fechaCierre) < fechaLimite);
    for(let h of historialAntiguo) {
        await db.ref(`cuadres_historial/${h.id}`).remove();
    }
    
    alert(`Historial antiguo limpiado para ${bancaKey}`);
    cargarPanelAdmin();
};

// ========== LIMPIAR HISTORIAL DEL CLIENTE (SIN AFECTAR DEUDA/FONDO) ==========
window.limpiarHistorialCliente = async function(clienteId, clienteNombre) {
    if(!confirm(`¿Limpiar historial de transacciones de "${clienteNombre}"?\n\n⚠️ SOLO se eliminará el REGISTRO de transacciones. El saldo actual (Deuda RD$ ${clientes.find(c => c.id === clienteId)?.deuda || 0} y Fondo RD$ ${clientes.find(c => c.id === clienteId)?.fondo || 0}) NO se afecta.`)) return;
    
    const deudasCliente = deudas.filter(d => d.clienteId === clienteId);
    for(let d of deudasCliente) {
        await db.ref(`deudas/${d.id}`).remove();
    }
    
    alert(`✅ Historial de "${clienteNombre}" limpiado exitosamente. Los saldos actuales se mantienen.`);
    if(usuarioActual.rol === 'admin') cargarClientesAdmin(); else cargarClientesEmpleada();
};

// ========== MODAL REGISTRAR (AGREGAR) ==========
window.abrirModalRegistrar = function(tipo) {
    document.getElementById('registrarTipoMovimiento').value = tipo;
    
    let titulo = '';
    if(tipo === 'prestamo') titulo = '🏦 Registrar Préstamo';
    if(tipo === 'comision') titulo = '📊 Registrar Comisión';
    if(tipo === 'central') titulo = '🏢 Registrar Cuadre Central';
    document.getElementById('lblRegistrarModalTitulo').textContent = titulo;
    
    const wrapperTipoPrestamo = document.getElementById('wrapperTipoPrestamo');
    if(wrapperTipoPrestamo) {
        wrapperTipoPrestamo.classList.toggle('hidden', tipo !== 'prestamo');
    }
    
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
        banca: banca,
        monto: monto,
        nota: nota,
        retirado: false,
        fecha: ahora.toLocaleDateString('es-DO'),
        hora: ahora.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' }),
        timestamp: ahora.toISOString(),
        fechaOriginal: fechaPersonalizada || null
    };
    
    if(tipo === 'prestamo') {
        datos.tipoPrestamo = tipoPrestamo;
        await db.ref('prestamos').push(datos);
        alert(`Préstamo ${tipoPrestamo.toUpperCase()} registrado correctamente`);
    }
    if(tipo === 'comision') {
        await db.ref('comisiones').push(datos);
        alert('Comisión registrada correctamente');
    }
    if(tipo === 'central') {
        await db.ref('cuadres_central').push(datos);
        alert('Cuadre Central registrado correctamente');
    }
    
    cerrarModal('modalRegistrarTrans');
    cargarPanelAdmin();
};

// ========== MODAL RETIRAR (ELIMINAR LÓGICO) ==========
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
        options += `<option value="${item.id}">${item.banca.toUpperCase()}${tipoLabel} - RD$ ${item.monto} (${item.fecha} ${item.hora}) - ${item.nota || 'Sin nota'}</option>`;
    });
    
    const itemsList = document.getElementById('retirarItemsList');
    if(itemsList) itemsList.innerHTML = options;
    
    document.getElementById('retirarFecha').value = new Date().toISOString().slice(0,16);
    abrirModal('modalRetirarTrans');
};

window.retirarMovimiento = async function() {
    const tipo = document.getElementById('retirarTipoMovimiento').value;
    const itemId = document.getElementById('retirarItemsList').value;
    const fechaRetiroPersonalizada = document.getElementById('retirarFecha').value;
    
    if(!itemId) return alert('Seleccione un movimiento para retirar');
    if(!confirm('¿Seguro que deseas retirar este movimiento? Se marcará como retirado.')) return;
    
    const fechaRetiro = fechaRetiroPersonalizada ? new Date(fechaRetiroPersonalizada) : new Date();
    
    const updateData = { 
        retirado: true, 
        fechaRetiro: fechaRetiro.toISOString(),
        fechaRetiroStr: fechaRetiro.toLocaleDateString('es-DO'),
        horaRetiroStr: fechaRetiro.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })
    };
    
    if(tipo === 'prestamo') {
        await db.ref(`prestamos/${itemId}`).update(updateData);
    } else if(tipo === 'comision') {
        await db.ref(`comisiones/${itemId}`).update(updateData);
    } else if(tipo === 'central') {
        await db.ref(`cuadres_central/${itemId}`).update(updateData);
    }
    
    cerrarModal('modalRetirarTrans');
    alert('Movimiento retirado exitosamente');
    cargarPanelAdmin();
};

window.limpiarCuadresPendientes = async function(bancaKey) {
    if(!confirm(`¿Limpiar TODOS los cuadres pendientes de ${bancaKey}? Se moverán al historial.`)) return;
    
    const cpActivos = cuadresPendientes.filter(cp => cp.banca === bancaKey);
    
    for(let cp of cpActivos) {
        await db.ref('cuadres_historial').push({ ...cp, estado: 'REVISADO POR ADMIN', fechaCierre: new Date().toLocaleString('es-DO') });
        await db.ref(`cuadres_pendientes/${cp.id}`).remove();
    }
    alert(`Se limpiaron ${cpActivos.length} cuadres pendientes`);
    cargarPanelAdmin();
};

// ========== HISTORIAL CON FILTROS DE FECHAS ==========
window.abrirHistorialCuadresAdmin = function() {
    document.getElementById('pageTitle').textContent = 'Historial General';
    let html = `
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
    document.getElementById('contentArea').innerHTML = html;
    mostrarHistorialFiltrado();
};

function mostrarHistorialFiltrado() {
    let historialFiltrado = [...cuadresHistorial];
    const desde = document.getElementById('historialFechaDesde')?.value;
    const hasta = document.getElementById('historialFechaHasta')?.value;
    
    if(desde) {
        const fechaDesde = new Date(desde);
        historialFiltrado = historialFiltrado.filter(h => new Date(h.fechaCierre || h.fecha) >= fechaDesde);
    }
    if(hasta) {
        const fechaHasta = new Date(hasta);
        fechaHasta.setHours(23, 59, 59);
        historialFiltrado = historialFiltrado.filter(h => new Date(h.fechaCierre || h.fecha) <= fechaHasta);
    }
    
    historialFiltrado.reverse();
    
    if(historialFiltrado.length === 0) {
        document.getElementById('historialLista').innerHTML = '<p style="text-align:center; padding:30px; color:var(--text-muted);">No hay registros en este rango de fechas.</p>';
        return;
    }
    
    let html = '';
    historialFiltrado.forEach(c => {
        html += `
            <div class="mobile-card">
                <div class="card-top"><strong>${c.banca?.toUpperCase() || 'N/A'}</strong> <span class="mobile-badge badge-danger">${c.estado || 'ARCHIVADO'}</span></div>
                <p style="font-size:12px; line-height:1.4;"><b>Operadora:</b> ${c.empleada || 'Desconocida'}<br>
                <b>Efectivo:</b> RD$ ${c.totalEfectivoCalculado || 0} | <b>Diferencia:</b> ${c.diferencia || 0}<br>
                <b>Fecha:</b> ${c.fechaCierre || c.fecha || ''}<br>
                <small style="color:var(--text-muted);">${c.hora || ''}</small></p>
                <button class="mobile-btn btn-warning-filled" style="padding:5px; font-size:11px; margin-top:8px;" onclick="eliminarHistorialCuadre('${c.id}')"><i class="fa-solid fa-trash-can"></i> Eliminar</button>
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
    if(!confirm("¿Seguro que deseas eliminar este registro del historial?")) return;
    await db.ref(`cuadres_historial/${id}`).remove();
    alert('Registro eliminado.');
    mostrarHistorialFiltrado();
};

// ========== VISTA: EMPLEADA ==========
window.cargarPanelEmpleada = function() {
    if (!usuarioActual) return;
    document.getElementById('pageTitle').textContent = 'Mi Banca';
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

// ========== FUNCIÓN PARA CALCULAR DÍAS DE MORA ==========
function calcularDiasMorosidad(fechaActualizacion) {
    if (!fechaActualizacion) return 99;
    const ahora = new Date();
    const ultimaActualizacion = new Date(fechaActualizacion);
    const diffTime = Math.abs(ahora - ultimaActualizacion);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

// ========== RENDER DE CLIENTES ==========
function renderListaClientesMovil(lista, esAdmin) {
    document.getElementById('pageTitle').textContent = 'Mis Clientes';
    let html = '';
    const ahora = new Date();

    html += `
        <button class="mobile-btn btn-primary-filled" style="margin-bottom:12px;" onclick="abrirFichaDetalle('nuevo', ${esAdmin})">
            <i class="fa-solid fa-user-plus"></i> + Nuevo Cliente
        </button>
    `;

    if(lista.length === 0) { 
        html += '<p style="text-align:center; padding:20px; color:var(--text-muted);">No hay clientes registrados.</p>'; 
    }

    lista.forEach(c => {
        const diasMorosidad = calcularDiasMorosidad(c.fechaActualizacion);
        
        let estadoTexto = '';
        let estadoColor = '';
        if (diasMorosidad <= 2) {
            estadoTexto = '✅ Al Día';
            estadoColor = 'badge-success';
        } else if (diasMorosidad <= 7) {
            estadoTexto = `⚠️ Aviso (${diasMorosidad} días)`;
            estadoColor = 'badge-warning';
        } else {
            estadoTexto = `🔴 Moroso (${diasMorosidad} días)`;
            estadoColor = 'badge-danger';
        }

        html += `
            <div class="mobile-card ${diasMorosidad > 2 ? 'moroso-card' : ''}">
                <div class="card-top">
                    <span class="card-title">${c.nombre}</span>
                    <span class="mobile-badge ${estadoColor}">${estadoTexto}</span>
                </div>
                <div class="card-row-data">
                    <div class="data-cell">
                        <label>💳 Deuda</label>
                        <p style="color:${(c.deuda || 0) > 0 ? 'var(--danger)' : 'var(--success)'}">RD$ ${(c.deuda || 0).toFixed(2)}</p>
                    </div>
                    <div class="data-cell">
                        <label>💰 Fondo</label>
                        <p>RD$ ${(c.fondo || 0).toFixed(2)}</p>
                    </div>
                </div>
                <div class="card-actions">
                    <button class="mini-btn mini-btn-success" onclick="abrirCobroCliente('${c.id}')">
                        <i class="fa-solid fa-hand-holding-usd"></i> Cobrar
                    </button>
                    <button class="mini-btn mini-btn-danger" onclick="abrirTicketCliente('${c.id}')">
                        <i class="fa-solid fa-ticket"></i> Ticket
                    </button>
                    <button class="mini-btn mini-btn-info" onclick="abrirDepositoFondo('${c.id}')">
                        <i class="fa-solid fa-money-bill-transfer"></i> Depositar
                    </button>
                    ${(c.fondo || 0) > 0 && (c.deuda || 0) === 0 ? 
                        `<button class="mini-btn mini-btn-warning" onclick="retirarFondoCliente('${c.id}')">
                            <i class="fa-solid fa-money-bill"></i> Retirar
                        </button>` : ''}
                    <button class="mini-btn" onclick="lanzarRecordatorioPago('${c.id}')">
                        <i class="fa-brands fa-whatsapp"></i> Msj
                    </button>
                    <button class="mini-btn" onclick="abrirFichaDetalle('${c.id}', ${esAdmin})">
                        <i class="fa-solid fa-edit"></i> Editar
                    </button>
                    ${esAdmin ? 
                        `<button class="mini-btn mini-btn-danger" onclick="limpiarHistorialCliente('${c.id}', '${c.nombre}')">
                            <i class="fa-solid fa-trash"></i> Limpiar Historial
                        </button>` : ''}
                    ${esAdmin ? 
                        `<button class="mini-btn mini-btn-danger" onclick="eliminarCliente('${c.id}', '${c.nombre}')">
                            <i class="fa-solid fa-trash"></i> Eliminar
                        </button>` : ''}
                </div>
            </div>
        `;
    });
    document.getElementById('contentArea').innerHTML = html;
}

// ========== FUNCIONES DE CLIENTES ==========
window.cargarClientesAdmin = function() { renderListaClientesMovil(clientes, true); };
window.cargarClientesEmpleada = function() { 
    if (!usuarioActual) return;
    renderListaClientesMovil(clientes.filter(c => c.banca === usuarioActual.banca), false); 
};

// ========== DEPOSITAR FONDO ==========
window.abrirDepositoFondo = function(clienteId) {
    const c = clientes.find(cl => cl.id === clienteId);
    if (!c) return;
    
    const montoDeposito = prompt(`💰 DEPOSITAR FONDO\nCliente: ${c.nombre}\nFondo actual: RD$ ${(c.fondo || 0).toFixed(2)}\n\n¿Cuánto desea depositar?`, "0");
    
    if (!montoDeposito) return;
    const monto = parseFloat(montoDeposito);
    
    if (isNaN(monto) || monto <= 0) {
        alert("Monto inválido");
        return;
    }
    
    const nuevoFondo = (c.fondo || 0) + monto;
    
    db.ref('deudas').push({ 
        clienteId: clienteId, 
        monto: 0,
        deposito: monto,
        concepto: "Depósito de fondo", 
        fecha: new Date().toLocaleDateString('es-DO'),
        hora: new Date().toLocaleTimeString('es-DO'),
        timestamp: new Date().toISOString(),
        tipoOperacion: 'deposito_fondo'
    });
    
    db.ref(`clientes/${clienteId}`).update({ 
        fondo: nuevoFondo,
        fechaActualizacion: new Date().toISOString() 
    });
    
    alert(`✅ Depósito de RD$ ${monto} realizado. Nuevo fondo: RD$ ${nuevoFondo}`);
    
    if(usuarioActual.rol === 'admin') {
        cargarClientesAdmin();
    } else {
        cargarClientesEmpleada();
    }
};

// ========== RETIRAR FONDO ==========
window.retirarFondoCliente = function(clienteId) {
    const c = clientes.find(cl => cl.id === clienteId);
    if (!c) return;
    
    if ((c.deuda || 0) > 0) {
        alert(`⚠️ El cliente ${c.nombre} tiene una deuda pendiente de RD$ ${c.deuda}. Debe pagar la deuda antes de retirar fondo.`);
        return;
    }
    
    if ((c.fondo || 0) <= 0) {
        alert(`⚠️ El cliente ${c.nombre} no tiene fondo disponible para retirar.`);
        return;
    }
    
    const montoMaximo = c.fondo;
    const montoRetiro = prompt(`💰 RETIRAR FONDO\nCliente: ${c.nombre}\nFondo disponible: RD$ ${montoMaximo}\n\n¿Cuánto desea retirar?`, montoMaximo);
    
    if (!montoRetiro) return;
    const monto = parseFloat(montoRetiro);
    
    if (isNaN(monto) || monto <= 0) {
        alert("Monto inválido");
        return;
    }
    
    if (monto > montoMaximo) {
        alert(`El monto no puede exceder el fondo disponible (RD$ ${montoMaximo})`);
        return;
    }
    
    const nuevoFondo = (c.fondo || 0) - monto;
    
    db.ref('deudas').push({ 
        clienteId: clienteId, 
        monto: -monto, 
        concepto: "Retiro de fondo en efectivo", 
        fecha: new Date().toLocaleDateString('es-DO'),
        hora: new Date().toLocaleTimeString('es-DO'),
        timestamp: new Date().toISOString(),
        tipoOperacion: 'retiro_fondo'
    });
    
    db.ref(`clientes/${clienteId}`).update({ 
        fondo: nuevoFondo,
        fechaActualizacion: new Date().toISOString() 
    });
    
    alert(`✅ Retiro de RD$ ${monto} realizado. Nuevo fondo: RD$ ${nuevoFondo}`);
    
    if(usuarioActual.rol === 'admin') {
        cargarClientesAdmin();
    } else {
        cargarClientesEmpleada();
    }
};

// ========== GUARDAR DEUDA (TICKET/COBRO) CORREGIDA ==========
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
        // TICKET: Primero descuenta del FONDO, el excedente va a DEUDA
        if (nuevoFondo >= monto) {
            nuevoFondo -= monto;
            mensaje = `✅ Ticket de RD$ ${monto} registrado. Se descontó del FONDO. Nuevo fondo: RD$ ${nuevoFondo}`;
        } else {
            const resto = monto - nuevoFondo;
            nuevaDeuda += resto;
            mensaje = `✅ Ticket de RD$ ${monto} registrado. Se usó todo el fondo (RD$ ${nuevoFondo}) y se agregaron RD$ ${resto} a la DEUDA. Nueva deuda: RD$ ${nuevaDeuda}`;
            nuevoFondo = 0;
        }
    } 
    else if (tipo === 'pago') {
        // COBRO: Primero reduce la DEUDA, luego el FONDO
        if (nuevaDeuda > 0) {
            if (monto >= nuevaDeuda) {
                const sobrante = monto - nuevaDeuda;
                nuevoFondo = Math.max(0, nuevoFondo - sobrante);
                mensaje = `✅ Cobro aplicado: Se liquidó deuda de RD$ ${nuevaDeuda}. ${sobrante > 0 ? `Sobrante RD$ ${sobrante} descontado del fondo. Nuevo fondo: RD$ ${nuevoFondo}` : ''}`;
                nuevaDeuda = 0;
            } else {
                nuevaDeuda -= monto;
                mensaje = `✅ Cobro aplicado a deuda: -RD$ ${monto}. Deuda restante: RD$ ${nuevaDeuda}`;
            }
        } else {
            nuevoFondo = Math.max(0, nuevoFondo - monto);
            mensaje = `✅ Cobro aplicado al fondo: -RD$ ${monto}. Fondo restante: RD$ ${nuevoFondo}`;
        }
    }
    
    await db.ref('deudas').push({ 
        clienteId: cid, 
        monto: tipo === 'deuda' ? monto : -monto, 
        concepto: conc, 
        fecha: new Date().toLocaleDateString('es-DO'),
        hora: new Date().toLocaleTimeString('es-DO'),
        timestamp: new Date().toISOString(),
        tipoOperacion: tipo
    });
    
    await db.ref(`clientes/${cid}`).update({ 
        deuda: nuevaDeuda, 
        fondo: nuevoFondo,
        fechaActualizacion: new Date().toISOString() 
    });
    
    alert(mensaje);
    cerrarModal('modalDeuda');
    
    if(usuarioActual.rol === 'admin') {
        cargarClientesAdmin();
    } else {
        cargarClientesEmpleada();
    }
};

// ========== RECORDATORIO CON DATOS BANCARIOS ==========
window.lanzarRecordatorioPago = function(id) {
    const c = clientes.find(cl => cl.id === id);
    if (!c) return;
    
    const diasMorosidad = calcularDiasMorosidad(c.fechaActualizacion);
    const deuda = c.deuda || 0;
    const fondo = c.fondo || 0;
    
    let mensajeMorosidad = '';
    if (diasMorosidad <= 2) {
        mensajeMorosidad = `✅ Cliente al día. Último pago hace ${diasMorosidad} días.`;
    } else if (diasMorosidad <= 7) {
        mensajeMorosidad = `⚠️ ATENCIÓN: Tiene ${diasMorosidad} días sin actualizar su estado.`;
    } else {
        mensajeMorosidad = `🔴 URGENTE: Tiene ${diasMorosidad} días sin realizar pagos.`;
    }
    
    const msg = `*🏦 BANCAS KIKO - RECORDATORIO DE PAGO* 🏦\n\n` +
        `Saludos *${c.nombre}*,\n\n` +
        `${mensajeMorosidad}\n\n` +
        `💰 *BALANCE PENDIENTE:* RD$ ${deuda.toFixed(2)}\n` +
        `💵 *FONDO DISPONIBLE:* RD$ ${fondo.toFixed(2)}\n\n` +
        `📌 *DATOS PARA TRANSFERENCIA:*\n` +
        `─────────────────────\n` +
        `🏛 *BANRESERVAS* (Cuenta de Ahorro)\n` +
        `👤 A nombre: JUAN FRANCISCO LORENZO\n` +
        `🔢 Número: *4244961290*\n` +
        `─────────────────────\n` +
        `🏛 *BANCO POPULAR* (Cuenta Corriente)\n` +
        `👤 A nombre: JUAN FRANCISCO LORENZO\n` +
        `🔢 Número: *846212900*\n` +
        `─────────────────────\n\n` +
        `📱 *ENVIAR COMPROBANTE DE PAGO* para confirmar y actualizar su estado.\n\n` +
        `🙏 ¡Gracias por preferirnos!\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n` +
        `🤖 Mensaje automático - BANCAS KIKO`;
    
    document.getElementById('recordatorioMensaje').value = msg;
    document.getElementById('recordatorioTelefono').value = c.whatsapp || '';
    abrirModal('modalRecordatorio');
};

// ========== ELIMINAR CLIENTE ==========
window.eliminarCliente = async function(clienteId, clienteNombre) {
    if(!confirm(`¿Está SEGURO de eliminar al cliente "${clienteNombre}"?\n\n⚠️ Esta acción eliminará TODOS sus datos (historial, deudas, fondo). Esta acción NO se puede deshacer.`)) return;
    
    try {
        const deudasCliente = deudas.filter(d => d.clienteId === clienteId);
        for(let d of deudasCliente) {
            await db.ref(`deudas/${d.id}`).remove();
        }
        
        await db.ref(`clientes/${clienteId}`).remove();
        
        alert(`✅ Cliente "${clienteNombre}" eliminado completamente`);
        
        if(usuarioActual.rol === 'admin') {
            cargarClientesAdmin();
        } else {
            cargarClientesEmpleada();
        }
    } catch(error) {
        console.error("Error al eliminar cliente:", error);
        alert("Error al eliminar el cliente. Intente nuevamente.");
    }
};

// ========== ABRIR FICHA DETALLE (CREAR/EDITAR) ==========
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

    let historialHtml = `
        <div class="input-row" style="margin-bottom:8px;">
            <input type="date" id="historialClienteDesde" class="mobile-input" style="font-size:11px; padding:6px;" placeholder="Desde">
            <input type="date" id="historialClienteHasta" class="mobile-input" style="font-size:11px; padding:6px;" placeholder="Hasta">
            <button class="mini-btn" onclick="filtrarHistorialCliente('${id}')">Filtrar</button>
        </div>
        <div id="historialClienteLista"></div>
    `;
    document.getElementById('historialTransaccionesCliente').innerHTML = historialHtml;
    
    window.cargarHistorialCliente = function(clienteId) {
        let filtradas = deudas.filter(d => d.clienteId === clienteId);
        
        const desde = document.getElementById('historialClienteDesde')?.value;
        const hasta = document.getElementById('historialClienteHasta')?.value;
        
        if(desde) {
            const fechaDesde = new Date(desde);
            filtradas = filtradas.filter(f => new Date(f.fecha) >= fechaDesde);
        }
        if(hasta) {
            const fechaHasta = new Date(hasta);
            fechaHasta.setHours(23, 59, 59);
            filtradas = filtradas.filter(f => new Date(f.fecha) <= fechaHasta);
        }
        
        filtradas.reverse();
        
        if(filtradas.length === 0) {
            document.getElementById('historialClienteLista').innerHTML = 'No hay registros en este rango.';
            return;
        }
        
        let hHtml = '';
        filtradas.forEach(f => {
            const esTicket = f.monto > 0;
            const esDeposito = f.deposito > 0;
            if (esDeposito) {
                hHtml += `<div style="padding:4px 0; border-bottom:1px solid #e2e8f0;">
                    • ${f.fecha || ''} | ${f.hora || ''} | 💰 Depósito: <b>RD$ ${f.deposito}</b> 
                    <span style="color:var(--text-muted); font-size:10px;">(${f.concepto || ''})</span>
                </div>`;
            } else {
                hHtml += `<div style="padding:4px 0; border-bottom:1px solid #e2e8f0;">
                    • ${f.fecha || ''} | ${f.hora || ''} | ${esTicket ? '🎫 Ticket' : '💰 Cobro'}: <b>RD$ ${Math.abs(f.monto)}</b> 
                    <span style="color:var(--text-muted); font-size:10px;">(${f.concepto || ''})</span>
                </div>`;
            }
        });
        document.getElementById('historialClienteLista').innerHTML = hHtml;
    };
    
    window.filtrarHistorialCliente = function(clienteId) {
        cargarHistorialCliente(clienteId);
    };
    
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
    
    if(!nombre) {
        return alert('El nombre del cliente es obligatorio');
    }
    
    const datos = {
        nombre: nombre,
        whatsapp: whatsapp,
        banca: banca,
        deuda: deuda,
        fondo: fondo,
        fechaActualizacion: new Date().toISOString(),
        fechaCreacion: id ? undefined : new Date().toISOString()
    };
    
    try {
        if(!id) {
            await db.ref('clientes').push(datos);
            alert(`✅ Cliente "${nombre}" creado exitosamente`);
        } else {
            await db.ref(`clientes/${id}`).update(datos);
            alert(`✅ Cliente "${nombre}" actualizado exitosamente`);
        }
        
        cerrarModal('modalCliente');
        
        if(usuarioActual.rol === 'admin') {
            cargarClientesAdmin();
        } else {
            cargarClientesEmpleada();
        }
    } catch(error) {
        console.error("Error al guardar cliente:", error);
        alert("Error al guardar el cliente. Intente nuevamente.");
    }
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
            📊 <strong>Resumen del Cliente:</strong><br>
            💳 Deuda: RD$ ${deuda.toFixed(2)} ${deuda > 0 ? '⚠️' : '✅'}<br>
            💰 Fondo disponible: RD$ ${fondo.toFixed(2)}
            ${deuda > 0 ? '<br><span style="color:var(--danger);">⚠️ El cliente tiene deuda pendiente. El cobro se aplicará primero a la deuda.</span>' : '<br><span style="color:var(--success);">✅ Cliente sin deuda.</span>'}
            ${fondo > 0 ? '<br><span style="color:var(--info);">💡 Los tickets se descuentan primero del fondo.</span>' : '<br><span style="color:var(--warning);">⚠️ Cliente sin fondo disponible.</span>'}
        </div>`;
    }
}

// ========== CALCULADORA DE CUADRE ==========
window.cargarCalculadoraCuadre = function() {
    if (!usuarioActual) return;
    document.getElementById('pageTitle').textContent = 'Cuadre de Caja';
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
        tablaBilletes += `
            <tr>
                <td><strong>RD$ ${d}</strong></td>
                <td><input type="number" class="cash-input-qty" id="cash_${d}" value="0" min="0" oninput="calcularMatrizCuadre()"></td>
                <td style="text-align:right;">RD$ <span id="sub_${d}">0.00</span></td>
            </tr>
        `;
    });

    document.getElementById('contentArea').innerHTML = `
        <div class="summary-box" style="background:#fff;">
            <p style="font-weight:700; color:var(--primary); font-size:10px;">📈 VARIABLES DE ENTRADA</p>
            <div style="font-size:11px; margin-top:2px; color:var(--text-muted);">
                Base Banca: RD$ ${fBanca} | Depósitos Clientes: RD$ ${fTotalClientes}<br>
                Préstamos: RD$ ${pTotal} | Comisión: RD$ ${comTotal} | C. Central: RD$ ${cenTotal}
            </div>
            <label class="input-sublabel" style="margin-top:8px;">➕ Monto de Venta del Día</label>
            <input type="number" id="cuadreMontoDia" class="mobile-input" value="0" oninput="calcularMatrizCuadre()">
            <label class="input-sublabel">➕ Pendientes por Pagar</label>
            <input type="number" id="cuadrePendientePagar" class="mobile-input" value="0" oninput="calcularMatrizCuadre()">
        </div>

        <div class="summary-box" style="background:#fff;">
            <p style="font-weight:700; color:var(--danger); font-size:10px;">📉 VARIABLES DE SALIDA (RESTAS)</p>
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
            <button class="mobile-btn btn-warning-filled" onclick="copiarResultadoCuadre()">📋 Copiar Resultado</button>
            <button class="mobile-btn btn-whatsapp" onclick="enviarResultadoCuadreWhatsApp()">💬 Enviar por WhatsApp</button>
        </div>
        <p style="font-size:10px; color:var(--text-muted); text-align:center; margin-top:10px;">⚠️ Este cuadre es SOLO VISTA PREVIA. La Deuda Clientes se carga automáticamente.</p>
    `;

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

    const montoDia = parseFloat(document.getElementById('cuadreMontoDia').value) || 0;
    const pendientePagar = parseFloat(document.getElementById('cuadrePendientePagar').value) || 0;
    const deudaRestable = parseFloat(document.getElementById('cuadreDeudaTotalRestable').value) || 0;
    const deudaRestablelista = parseFloat(document.getElementById('cuadredeudalista').value) || 0;
    const perdidaEntrada = parseFloat(document.getElementById('cuadrePerdidaEntrada').value) || 0;

    const objetivo = (window.baseSumablesFijos + montoDia + pendientePagar) - (deudaRestable + perdidaEntrada + deudaRestablelista);
    const diferencia = totalEfectivo - objetivo;

    const lblDif = document.getElementById('lblDiferenciaCuadre');
    const lblEst = document.getElementById('lblEstadoCuadre');
    const box = document.getElementById('resultadoCuadreBox');

    if(lblDif && lblEst && box) {
        lblDif.textContent = `RD$ ${diferencia.toFixed(2)}`;
        if(Math.abs(diferencia) < 1) {
            lblEst.textContent = "🟢 SUCURSAL CUADRADA CORRECTAMENTE"; 
            box.style.background = "#d1fae5";
            window.estadoCuadreResultado = "CUADRADO OK";
        } else if (diferencia > 0) {
            lblEst.textContent = `🔵 SOBRANTE EN CAJA: RD$ ${diferencia.toFixed(2)}`; 
            box.style.background = "#e0f2fe";
            window.estadoCuadreResultado = "SOBRANTE";
        } else {
            lblEst.textContent = `🔴 FALTANTE EN CAJA: RD$ ${Math.abs(diferencia).toFixed(2)}`; 
            box.style.background = "#fee2e2";
            window.estadoCuadreResultado = "FALTANTE";
        }
    }
    window.montoDiferenciaCalculada = diferencia;
    window.totalEfectivoCalculado = totalEfectivo;
};

window.copiarResultadoCuadre = function() {
    const resultado = generarTextoCuadre();
    navigator.clipboard.writeText(resultado);
    alert('Resultado copiado al portapapeles');
};

window.enviarResultadoCuadreWhatsApp = function() {
    const resultado = generarTextoCuadre();
    const url = `https://wa.me/?text=${encodeURIComponent(resultado)}`;
    window.open(url, '_blank');
};

function generarTextoCuadre() {
    const ahora = new Date();
    const deudaRestable = parseFloat(document.getElementById('cuadreDeudaTotalRestable')?.value) || 0;
    const texto = `📊 *CUADRE DE CAJA - ${usuarioActual.nombre.toUpperCase()}*\n` +
        `📅 Fecha: ${ahora.toLocaleDateString('es-DO')}\n` +
        `⏰ Hora: ${ahora.toLocaleTimeString('es-DO')}\n` +
        `💰 Total Efectivo: RD$ ${window.totalEfectivoCalculado.toFixed(2)}\n` +
        `📉 Deuda Clientes: RD$ ${deudaRestable}\n` +
        `📈 Estado: ${window.estadoCuadreResultado}\n` +
        `🔄 Diferencia: RD$ ${window.montoDiferenciaCalculada.toFixed(2)}\n` +
        `---\nEnviado desde Sistema Kiko App`;
    return texto;
}

// ========== GESTIÓN DE LOTERÍA ==========
window.cargarGestionLoteria = function() {
    document.getElementById('pageTitle').textContent = 'Gestión de Lotería';
    let html = `
        <div class="mobile-card">
            <h3 style="font-size:14px; margin-bottom:12px;">🎲 Registrar Resultado de Lotería</h3>
            <label class="input-sublabel">📅 Fecha del Sorteo</label>
            <input type="date" id="loteriaFecha" class="mobile-input" value="${new Date().toISOString().slice(0,10)}">
            <label class="input-sublabel">🏆 Tipo de Lotería</label>
            <select id="loteriaTipo" class="mobile-input">
                <option value="Loteca">Loteca</option>
                <option value="Loto Real">Loto Real</option>
                <option value="Leidsa">Leidsa</option>
                <option value="Nacional">Nacional</option>
                <option value="Pega 3">Pega 3</option>
                <option value="Pega 4">Pega 4</option>
            </select>
            <label class="input-sublabel">🔢 Números Ganadores</label>
            <input type="text" id="loteriaNumeros" class="mobile-input" placeholder="Ej: 12-24-36-48">
            <label class="input-sublabel">💰 Premio/Monto (opcional)</label>
            <input type="number" id="loteriaPremio" class="mobile-input" placeholder="RD$">
            <button class="mobile-btn btn-primary-filled" onclick="guardarResultadoLoteria()">💾 Guardar Resultado</button>
        </div>
        
        <div class="summary-box" style="background:#fff;">
            <h3 style="font-size:14px; margin-bottom:8px;">📋 Resultados Recientes</h3>
            <div id="listaResultadosLoteria"></div>
        </div>
        
        <div style="display: flex; gap: 8px; margin-top:12px;">
            <button class="mobile-btn btn-whatsapp" onclick="enviarRecordatorioLoteria()">💬 Enviar Recordatorio de Cierre</button>
            <button class="mobile-btn btn-info" onclick="enviarUltimoResultadoLoteria()">📢 Enviar Último Resultado</button>
        </div>
        <p style="font-size:10px; color:var(--text-muted); text-align:center; margin-top:10px;">Los resultados se guardan para consulta y envío por WhatsApp.</p>
    `;
    document.getElementById('contentArea').innerHTML = html;
    mostrarResultadosLoteria();
};

function mostrarResultadosLoteria() {
    let resultados = [...loterias];
    resultados.reverse();
    
    if(resultados.length === 0) {
        document.getElementById('listaResultadosLoteria').innerHTML = '<p style="text-align:center; padding:20px; color:var(--text-muted);">No hay resultados registrados.</p>';
        return;
    }
    
    let html = '';
    resultados.slice(0, 10).forEach(r => {
        html += `
            <div style="padding:10px; border-bottom:1px solid var(--border-color);">
                <strong>${r.fecha || 'Sin fecha'}</strong> - ${r.tipo || 'Lotería'}<br>
                <span style="font-size:16px; font-weight:700; color:var(--primary);">${r.numeros || 'N/A'}</span>
                ${r.premio ? `<br>💰 Premio: RD$ ${r.premio}` : ''}
                ${usuarioActual.rol === 'admin' ? `<button class="mini-btn mini-btn-danger" style="margin-top:5px;" onclick="eliminarResultadoLoteria('${r.id}')">Eliminar</button>` : ''}
            </div>
        `;
    });
    document.getElementById('listaResultadosLoteria').innerHTML = html;
}

window.guardarResultadoLoteria = async function() {
    const fecha = document.getElementById('loteriaFecha').value;
    const tipo = document.getElementById('loteriaTipo').value;
    const numeros = document.getElementById('loteriaNumeros').value;
    const premio = parseFloat(document.getElementById('loteriaPremio').value) || 0;
    
    if(!fecha || !numeros) {
        return alert('Complete los campos obligatorios (fecha y números)');
    }
    
    const datos = {
        fecha: fecha,
        tipo: tipo,
        numeros: numeros,
        premio: premio,
        registradoPor: usuarioActual.nombre,
        timestamp: new Date().toISOString()
    };
    
    await db.ref('loterias').push(datos);
    alert('Resultado de lotería guardado');
    document.getElementById('loteriaNumeros').value = '';
    document.getElementById('loteriaPremio').value = '';
    cargarGestionLoteria();
};

window.eliminarResultadoLoteria = async function(id) {
    if(!confirm('¿Eliminar este resultado de lotería?')) return;
    await db.ref(`loterias/${id}`).remove();
    alert('Resultado eliminado');
    cargarGestionLoteria();
};

window.enviarRecordatorioLoteria = function() {
    const hoy = new Date().toLocaleDateString('es-DO');
    const msg = `🎰 *RECORDATORIO DE CIERRE DE LOTERÍA* 🎰\n\n` +
        `📅 Fecha: ${hoy}\n` +
        `⏰ Hora límite para jugar: 11:59 PM\n\n` +
        `🎯 *LOTERÍAS DISPONIBLES:*\n` +
        `• Loteca\n` +
        `• Loto Real\n` +
        `• Leidsa\n` +
        `• Nacional\n` +
        `• Pega 3\n` +
        `• Pega 4\n\n` +
        `⚠️ *RECUERDE:* Los boletos deben ser sellados antes del cierre.\n` +
        `¡Suerte a todos! 🍀\n\n` +
        `---\nEnviado desde Sistema Kiko App`;
    
    document.getElementById('recordatorioMensaje').value = msg;
    document.getElementById('recordatorioTelefono').value = '';
    abrirModal('modalRecordatorio');
};

window.enviarUltimoResultadoLoteria = function() {
    if(loterias.length === 0) {
        return alert('No hay resultados de lotería registrados');
    }
    
    const ultimo = loterias.reduce((latest, current) => {
        return new Date(current.timestamp) > new Date(latest.timestamp) ? current : latest;
    });
    
    const msg = `🎉 *RESULTADO DE LOTERÍA* 🎉\n\n` +
        `📅 Fecha: ${ultimo.fecha}\n` +
        `🎯 Tipo: ${ultimo.tipo}\n` +
        `🔢 Números Ganadores: *${ultimo.numeros}*\n` +
        `${ultimo.premio ? `💰 Premio: RD$ ${ultimo.premio}\n` : ''}\n` +
        `---\nEnviado desde Sistema Kiko App`;
    
    document.getElementById('recordatorioMensaje').value = msg;
    document.getElementById('recordatorioTelefono').value = '';
    abrirModal('modalRecordatorio');
};

// ========== AUXILIARES ==========
window.copiarMensajePortapapeles = function() {
    const txt = document.getElementById('recordatorioMensaje');
    if(txt) {
        txt.select();
        navigator.clipboard.writeText(txt.value);
        alert('Texto copiado al portapapeles.');
    }
};

window.enviarRecordatorio = function() {
    const tel = document.getElementById('recordatorioTelefono').value;
    const txt = encodeURIComponent(document.getElementById('recordatorioMensaje').value);
    const url = tel ? `https://wa.me/${tel}?text=${txt}` : `https://wa.me/?text=${txt}`;
    window.open(url, '_blank');
    cerrarModal('modalRecordatorio');
};

window.abrirFlujoTransaccion = function() {
    if (!usuarioActual) return;
    let opts = '';
    const filtrados = clientes.filter(c => c.banca === usuarioActual.banca);
    if(filtrados.length === 0) { 
        opts = '<option value="">No hay clientes en esta sucursal</option>'; 
    } else { 
        filtrados.forEach(c => { 
            opts += `<option value="${c.id}" data-deuda="${c.deuda || 0}" data-fondo="${c.fondo || 0}">${c.nombre} (Deuda: RD$ ${c.deuda || 0} | Fondo: RD$ ${c.fondo || 0})</option>`; 
        }); 
    }
    const deudaClienteSelect = document.getElementById('deudaCliente');
    if(deudaClienteSelect) deudaClienteSelect.innerHTML = opts;
    
    if (!document.getElementById('clienteInfoPreview')) {
        const modalContent = document.querySelector('#modalDeuda .sheet-content');
        if(modalContent) {
            const infoDiv = document.createElement('div');
            infoDiv.id = 'clienteInfoPreview';
            modalContent.insertBefore(infoDiv, modalContent.firstChild);
        }
    }
    
    const clienteSelect = document.getElementById('deudaCliente');
    if(clienteSelect) {
        clienteSelect.onchange = function() { actualizarInfoClientePreview(); };
    }
    
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
