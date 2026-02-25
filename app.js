// ========== CONFIGURACIÓN FIREBASE ==========
const firebaseConfig = {
    apiKey: "AIzaSyB3xTYP7wKgvFvySX8ZkHqm0Tly8y4LcM4",
    authDomain: "imprecioneswjs.firebaseapp.com",
    databaseURL: "https://imprecioneswjs-default-rtdb.firebaseio.com",
    projectId: "imprecioneswjs",
    storageBucket: "imprecioneswjs.appspot.com",
    appId: "1:923402098800:web:ef57d1e1bf1fdd758a3cb5"
};

// ========== VARIABLES GLOBALES ==========
let app, db;
let usuarioActual = null;
let empleadas = [];
let clientes = [];
let cuadresAdmin = [];
let cuadresBanca = [];
let premios = [];
let deudas = [];
let tickets = [];
let ticketsSolicitados = [];
let prestamos = [];
let nominas = [];
let gastos = [];
let faltantes = [];
let transferencias = [];

let bancas = {
    kiko1: { nombre: 'Banca Kiko 1', fondo: 0, ultimoCuadre: null, ultimoCuadreAdmin: null, historial: [] },
    kiko2: { nombre: 'Banca Kiko 2', fondo: 0, ultimoCuadre: null, ultimoCuadreAdmin: null, historial: [] },
    kiko3: { nombre: 'Banca Kiko 3', fondo: 0, ultimoCuadre: null, ultimoCuadreAdmin: null, historial: [] }
};

// ========== INICIALIZAR FIREBASE ==========
if (!firebase.apps.length) {
    app = firebase.initializeApp(firebaseConfig);
} else {
    app = firebase.app();
}
db = firebase.database();

// ========== CARGAR DATOS INICIALES ==========
async function cargarDatosIniciales() {
    try {
        const snapshots = await Promise.all([
            db.ref('empleadas').once('value'),
            db.ref('clientes').once('value'),
            db.ref('cuadres_admin').once('value'),
            db.ref('cuadres_banca').once('value'),
            db.ref('premios').once('value'),
            db.ref('deudas').once('value'),
            db.ref('tickets').once('value'),
            db.ref('tickets_solicitados').once('value'),
            db.ref('prestamos').once('value'),
            db.ref('nominas').once('value'),
            db.ref('gastos').once('value'),
            db.ref('faltantes').once('value'),
            db.ref('transferencias').once('value'),
            db.ref('fondos_bancas').once('value')
        ]);

        empleadas = snapshots[0].exists() ? Object.entries(snapshots[0].val()).map(([k,v]) => ({ id: k, ...v })) : [];
        clientes = snapshots[1].exists() ? Object.entries(snapshots[1].val()).map(([k,v]) => ({ id: k, ...v })) : [];
        cuadresAdmin = snapshots[2].exists() ? Object.entries(snapshots[2].val()).map(([k,v]) => ({ id: k, ...v })) : [];
        cuadresBanca = snapshots[3].exists() ? Object.entries(snapshots[3].val()).map(([k,v]) => ({ id: k, ...v })) : [];
        premios = snapshots[4].exists() ? Object.entries(snapshots[4].val()).map(([k,v]) => ({ id: k, ...v })) : [];
        deudas = snapshots[5].exists() ? Object.entries(snapshots[5].val()).map(([k,v]) => ({ id: k, ...v })) : [];
        tickets = snapshots[6].exists() ? Object.entries(snapshots[6].val()).map(([k,v]) => ({ id: k, ...v })) : [];
        ticketsSolicitados = snapshots[7].exists() ? Object.entries(snapshots[7].val()).map(([k,v]) => ({ id: k, ...v })) : [];
        prestamos = snapshots[8].exists() ? Object.entries(snapshots[8].val()).map(([k,v]) => ({ id: k, ...v })) : [];
        nominas = snapshots[9].exists() ? Object.entries(snapshots[9].val()).map(([k,v]) => ({ id: k, ...v })) : [];
        gastos = snapshots[10].exists() ? Object.entries(snapshots[10].val()).map(([k,v]) => ({ id: k, ...v })) : [];
        faltantes = snapshots[11].exists() ? Object.entries(snapshots[11].val()).map(([k,v]) => ({ id: k, ...v })) : [];
        transferencias = snapshots[12].exists() ? Object.entries(snapshots[12].val()).map(([k,v]) => ({ id: k, ...v })) : [];

        if (snapshots[13].exists()) {
            bancas = { ...bancas, ...snapshots[13].val() };
        }

        console.log('✅ Datos cargados');
        escucharCambios();
    } catch (error) {
        console.error('Error cargando datos:', error);
    }
}

// ========== ESCUCHAR CAMBIOS EN TIEMPO REAL ==========
function escucharCambios() {
    db.ref('empleadas').on('value', snapshot => {
        empleadas = snapshot.exists() ? Object.entries(snapshot.val()).map(([k,v]) => ({ id: k, ...v })) : [];
        if (usuarioActual) actualizarInterfaz();
    });

    db.ref('clientes').on('value', snapshot => {
        clientes = snapshot.exists() ? Object.entries(snapshot.val()).map(([k,v]) => ({ id: k, ...v })) : [];
        if (usuarioActual) actualizarInterfaz();
    });

    db.ref('cuadres_banca').on('value', snapshot => {
        cuadresBanca = snapshot.exists() ? Object.entries(snapshot.val()).map(([k,v]) => ({ id: k, ...v })) : [];
    });

    db.ref('cuadres_admin').on('value', snapshot => {
        cuadresAdmin = snapshot.exists() ? Object.entries(snapshot.val()).map(([k,v]) => ({ id: k, ...v })) : [];
    });

    db.ref('tickets_solicitados').on('value', snapshot => {
        ticketsSolicitados = snapshot.exists() ? Object.entries(snapshot.val()).map(([k,v]) => ({ id: k, ...v })) : [];
    });

    db.ref('prestamos').on('value', snapshot => {
        prestamos = snapshot.exists() ? Object.entries(snapshot.val()).map(([k,v]) => ({ id: k, ...v })) : [];
    });

    db.ref('gastos').on('value', snapshot => {
        gastos = snapshot.exists() ? Object.entries(snapshot.val()).map(([k,v]) => ({ id: k, ...v })) : [];
    });

    db.ref('faltantes').on('value', snapshot => {
        faltantes = snapshot.exists() ? Object.entries(snapshot.val()).map(([k,v]) => ({ id: k, ...v })) : [];
    });

    db.ref('transferencias').on('value', snapshot => {
        transferencias = snapshot.exists() ? Object.entries(snapshot.val()).map(([k,v]) => ({ id: k, ...v })) : [];
    });

    db.ref('fondos_bancas').on('value', snapshot => {
        if (snapshot.exists()) {
            bancas = { ...bancas, ...snapshot.val() };
        }
    });
}

// ========== LOGIN ==========
window.mostrarLoginAdmin = function() {
    document.getElementById('loginAdminForm').style.display = 'block';
    document.getElementById('loginEmpleadoForm').style.display = 'none';
    document.getElementById('loginClienteForm').style.display = 'none';
};

window.mostrarLoginEmpleado = function() {
    document.getElementById('loginAdminForm').style.display = 'none';
    document.getElementById('loginEmpleadoForm').style.display = 'block';
    document.getElementById('loginClienteForm').style.display = 'none';
};

window.mostrarLoginCliente = function() {
    document.getElementById('loginAdminForm').style.display = 'none';
    document.getElementById('loginEmpleadoForm').style.display = 'none';
    document.getElementById('loginClienteForm').style.display = 'block';
};

window.iniciarSesionAdmin = function() {
    const password = document.getElementById('loginAdminPassword').value;
    if (password === 'admin123') {
        usuarioActual = { 
            id: 'admin', 
            nombre: 'Administrador', 
            rol: 'admin', 
            avatar: 'A' 
        };
        cerrarModal('modalLogin');
        cargarMenu();
        cargarPanelAdmin();
    } else {
        alert('❌ Contraseña incorrecta');
    }
};

window.iniciarSesionEmpleado = function() {
    const usuario = document.getElementById('loginUsuario').value;
    const password = document.getElementById('loginPassword').value;

    const emp = empleadas.find(e => e.usuario === usuario && e.password === password);
    if (emp) {
        usuarioActual = { 
            id: emp.id, 
            nombre: emp.nombre, 
            rol: 'empleada', 
            banca: emp.banca,
            sueldo: emp.sueldo || 0,
            avatar: emp.nombre.charAt(0) 
        };
        cerrarModal('modalLogin');
        cargarMenu();
        cargarPanelEmpleada();
    } else {
        alert('❌ Usuario o contraseña incorrectos');
    }
};

window.iniciarSesionCliente = function() {
    const usuario = document.getElementById('loginClienteUsuario').value;

    const cli = clientes.find(c => c.usuario === usuario || c.whatsapp === usuario);
    if (cli) {
        usuarioActual = { 
            id: cli.id, 
            nombre: cli.nombre, 
            rol: 'cliente', 
            banca: cli.banca,
            avatar: cli.nombre.charAt(0) 
        };
        cerrarModal('modalLogin');
        cargarMenu();
        cargarPanelCliente();
    } else {
        alert('❌ Cliente no encontrado');
    }
};

window.cerrarSesion = function() {
    usuarioActual = null;
    document.getElementById('sidebarNav').innerHTML = '';
    document.getElementById('contentArea').innerHTML = '<div class="loading-screen"><div class="loading"></div><p>Sesión cerrada</p></div>';
    document.getElementById('sidebar').classList.remove('collapsed');
    abrirModal('modalLogin');
};

// ========== FUNCIONES UI ==========
window.abrirModal = (id) => document.getElementById(id).classList.remove('hidden');
window.cerrarModal = (id) => document.getElementById(id).classList.add('hidden');

// ===== FUNCIÓN TOGGLE SIDEBAR MEJORADA PARA MÓVIL =====
window.toggleSidebar = function() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay') || crearOverlay();
    const menuIcon = document.querySelector('#menuToggle i');
    
    if (window.innerWidth <= 768) {
        // Modo móvil
        if (sidebar.classList.contains('active')) {
            // Cerrar menú
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
            document.body.style.position = '';
            if (menuIcon) {
                menuIcon.className = 'fa-solid fa-bars';
            }
        } else {
            // Abrir menú
            sidebar.classList.add('active');
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.width = '100%';
            if (menuIcon) {
                menuIcon.className = 'fa-solid fa-times';
            }
        }
    } else {
        // Modo desktop - toggle collapse
        sidebar.classList.toggle('collapsed');
        document.getElementById('mainContent').classList.toggle('expanded');
    }
};

// Función para crear el overlay
function crearOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'sidebarOverlay';
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);
    
    // Cerrar menú al hacer click en el overlay
    overlay.addEventListener('click', function() {
        cerrarMenuMovil();
    });
    
    return overlay;
}

// Función para cerrar el menú en móvil
function cerrarMenuMovil() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const menuIcon = document.querySelector('#menuToggle i');
    
    if (window.innerWidth <= 768 && sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
        document.body.style.overflow = '';
        document.body.style.position = '';
        if (menuIcon) {
            menuIcon.className = 'fa-solid fa-bars';
        }
    }
}

// Cerrar menú al seleccionar una opción (en móvil)
document.addEventListener('click', function(event) {
    const target = event.target;
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menuToggle');
    
    // Si se hizo click en un enlace del menú (no en el toggle)
    if (window.innerWidth <= 768 && 
        sidebar.classList.contains('active') && 
        target.closest('.sidebar-nav a') && 
        !target.closest('#menuToggle')) {
        
        // Pequeño delay para que se vea el feedback del click
        setTimeout(() => {
            cerrarMenuMovil();
        }, 150);
    }
});

// Manejar cambio de tamaño de ventana
window.addEventListener('resize', function() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const menuIcon = document.querySelector('#menuToggle i');
    
    if (window.innerWidth > 768) {
        // Cambió a desktop
        sidebar.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
        document.body.style.overflow = '';
        document.body.style.position = '';
        if (menuIcon) {
            menuIcon.className = 'fa-solid fa-bars';
        }
    }
});

// Prevenir que el scroll del body afecte al menú abierto
document.addEventListener('touchmove', function(event) {
    const sidebar = document.getElementById('sidebar');
    if (window.innerWidth <= 768 && sidebar.classList.contains('active')) {
        // Si el target no es el sidebar o su contenido, prevenir scroll
        if (!event.target.closest('.sidebar')) {
            event.preventDefault();
        }
    }
}, { passive: false });

// Mejorar la experiencia táctil
document.addEventListener('touchstart', function(event) {
    const sidebar = document.getElementById('sidebar');
    if (window.innerWidth <= 768 && sidebar.classList.contains('active')) {
        // Detectar swipe hacia la izquierda para cerrar
        const touch = event.touches[0];
        const startX = touch.clientX;
        
        const handleTouchMove = function(e) {
            const currentX = e.touches[0].clientX;
            const diffX = currentX - startX;
            
            // Si swiped hacia la izquierda desde el borde del menú
            if (diffX < -50 && startX < 100) {
                cerrarMenuMovil();
                document.removeEventListener('touchmove', handleTouchMove);
                document.removeEventListener('touchend', handleTouchEnd);
            }
        };
        
        const handleTouchEnd = function() {
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
        };
        
        document.addEventListener('touchmove', handleTouchMove);
        document.addEventListener('touchend', handleTouchEnd);
    }
});

function actualizarFecha() {
    const ahora = new Date();
    document.getElementById('currentDate').textContent = ahora.toLocaleDateString('es-DO', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
}
setInterval(actualizarFecha, 1000);
actualizarFecha();

// ========== ACTUALIZAR INTERFAZ ==========
function actualizarInterfaz() {
    if (!usuarioActual) return;
    
    if (usuarioActual.rol === 'admin') {
        if (document.getElementById('pageTitle').textContent.includes('Dashboard')) {
            cargarPanelAdmin();
        }
    } else if (usuarioActual.rol === 'empleada') {
        if (document.getElementById('pageTitle').textContent.includes('Mi Panel')) {
            cargarPanelEmpleada();
        }
    }
}

// ========== MENÚ ==========
function cargarMenu() {
    document.getElementById('sidebarName').textContent = usuarioActual.nombre;
    document.getElementById('sidebarRole').textContent = 
        usuarioActual.rol === 'admin' ? 'Administrador' : 
        usuarioActual.rol === 'empleada' ? 'Empleada' : 'Cliente';
    document.getElementById('sidebarAvatar').textContent = usuarioActual.avatar;

    let menu = '';
    if (usuarioActual.rol === 'admin') {
        menu = `
            <a onclick="cargarPanelAdmin()" class="active"><i class="fa-solid fa-chart-pie"></i> <span>Dashboard</span></a>
            <a onclick="cargarEmpleadas()"><i class="fa-solid fa-users"></i> <span>Empleadas</span></a>
            <a onclick="cargarClientes()"><i class="fa-solid fa-user-group"></i> <span>Clientes</span></a>
            <a onclick="cargarTicketsAdmin()"><i class="fa-solid fa-ticket"></i> <span>Cargar Tickets</span></a>
            <a onclick="cargarSolicitudesTickets()"><i class="fa-solid fa-clock"></i> <span>Solicitudes de Pago</span></a>
            <a onclick="cargarGastosAdmin()"><i class="fa-solid fa-receipt"></i> <span>Gastos</span></a>
            <a onclick="cargarPrestamosAdmin()"><i class="fa-solid fa-hand-holding-dollar"></i> <span>Préstamos</span></a>
            <a onclick="cargarCuadresBancaAdmin()"><i class="fa-solid fa-building"></i> <span>Ver Cuadres</span></a>
            <a onclick="verFondosBancas()"><i class="fa-solid fa-piggy-bank"></i> <span>Fondos de Bancas</span></a>
            <a onclick="abrirModalNomina()"><i class="fa-solid fa-file-invoice-dollar"></i> <span>Nóminas</span></a>
            <a onclick="cargarPrestamosEmpleada()"><i class="fa-solid fa-hand-holding-dollar"></i> <span>Préstamos a Empleadas</span></a>
            <a onclick="cargarReportes()"><i class="fa-solid fa-chart-bar"></i> <span>Reportes</span></a>
            <a onclick="verHistorialTransferencias()"><i class="fa-solid fa-clock-rotate-left"></i> <span>Historial Transferencias</span></a>
            <a onclick="abrirModalCuadreAdmin()"><i class="fa-solid fa-file-invoice"></i> <span>Realizar Cuadre</span></a>
            <a onclick="abrirLoterias()"><i class="fa-solid fa-dice"></i> <span>Ver Loterías</span></a>
        `;
    } else if (usuarioActual.rol === 'empleada') {
        menu = `
            <a onclick="cargarPanelEmpleada()" class="active"><i class="fa-solid fa-home"></i> <span>Mi Panel</span></a>
            <a onclick="abrirCuadreBanca()"><i class="fa-solid fa-calculator"></i> <span>Mi Cuadre</span></a>
            <a onclick="abrirVerificarTicket()"><i class="fa-solid fa-magnifying-glass"></i> <span>Verificar Ticket</span></a>
            <a onclick="cargarMisSolicitudes()"><i class="fa-solid fa-clock"></i> <span>Mis Solicitudes</span></a>
            <a onclick="cargarMisClientes()"><i class="fa-solid fa-users"></i> <span>Mis Clientes</span></a>
            <a onclick="abrirModalDeuda()"><i class="fa-solid fa-dollar-sign"></i> <span>Registrar Deuda/Pago</span></a>
            <a onclick="abrirModalPremio()"><i class="fa-solid fa-trophy"></i> <span>Registrar Premio</span></a>
            <a onclick="abrirModalTransferencia()"><i class="fa-solid fa-money-bill-transfer"></i> <span>Registrar Transferencia</span></a>
            <a onclick="cargarRecordatorios()"><i class="fa-brands fa-whatsapp"></i> <span>Recordatorios</span></a>
            <a onclick="verMiNomina()"><i class="fa-solid fa-file-invoice-dollar"></i> <span>Mi Nómina</span></a>
            <a onclick="verMisPrestamos()"><i class="fa-solid fa-hand-holding-dollar"></i> <span>Mis Préstamos</span></a>
            <a onclick="abrirLoterias()"><i class="fa-solid fa-dice"></i> <span>Ver Loterías</span></a>
        `;
    } else {
        menu = `
            <a onclick="cargarPanelCliente()" class="active"><i class="fa-solid fa-home"></i> <span>Mi Estado</span></a>
            <a onclick="cargarMisPremios()"><i class="fa-solid fa-trophy"></i> <span>Mis Premios</span></a>
            <a onclick="cargarMisDeudas()"><i class="fa-solid fa-dollar-sign"></i> <span>Mis Deudas/Pagos</span></a>
            <a onclick="abrirLoterias()"><i class="fa-solid fa-dice"></i> <span>Ver Loterías</span></a>
        `;
    }
    document.getElementById('sidebarNav').innerHTML = menu;
}

// ========== LOTERÍAS ==========
window.abrirLoterias = function() {
    window.open('https://enloteria.com/', '_blank');
};

// ========== FUNCIÓN PARA CALCULAR FONDO DEL CLIENTE (CORREGIDO) ==========
function getFondoCliente(cliente) {
    // Fondo del cliente = Crédito - Deuda
    // Si es positivo: tiene dinero a favor
    // Si es negativo: debe dinero
    return (cliente.fondo || 0) - (cliente.deuda || 0);
}

// ========== FUNCIÓN PARA CALCULAR FONDO DISPONIBLE DE LA BANCA ==========
function calcularFondoDisponibleBanca(bancaKey) {
    const banca = bancas[bancaKey];
    if (!banca) return 0;
    
    const clientesBanca = clientes.filter(c => c.banca === bancaKey);
    const deudaTotal = clientesBanca.reduce((s,c) => s + (c.deuda || 0), 0);
    
    // Fondo disponible = Fondo de banca - Deuda total de clientes
    const fondoDisponible = (banca.fondo || 0) - deudaTotal;
    
    return fondoDisponible;
}

function calcularDiasInactivo(cliente) {
    if (!cliente.fechaActualizacion) return 999;
    const ultimaAct = new Date(cliente.fechaActualizacion);
    const hoy = new Date();
    const diffTime = Math.abs(hoy - ultimaAct);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

function esClienteMoroso(cliente) {
    const diasInactivo = calcularDiasInactivo(cliente);
    return diasInactivo > 3 && (cliente.deuda || 0) > 0;
}

function getClienteMensaje(cliente) {
    return cliente.mensajeAdmin || '';
}

// ========== CLIENTES ==========
window.cargarClientes = function() {
    document.getElementById('pageTitle').textContent = 'Gestión de Clientes';

    let html = `
        <div class="acciones-rapidas">
            <button class="btn btn-primary" onclick="abrirModalNuevoCliente()">
                <i class="fa-solid fa-plus"></i> Nuevo Cliente
            </button>
        </div>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Usuario</th>
                        <th>Nombre</th>
                        <th>Banca</th>
                        <th>WhatsApp</th>
                        <th>Deuda</th>
                        <th>Fondo</th>
                        <th>Estado</th>
                        <th>Última Actualización</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
    `;

    const clientesOrdenados = [...clientes].sort((a, b) => {
        const aMoroso = esClienteMoroso(a);
        const bMoroso = esClienteMoroso(b);
        if (aMoroso && !bMoroso) return -1;
        if (!aMoroso && bMoroso) return 1;
        return (b.deuda || 0) - (a.deuda || 0);
    });

    clientesOrdenados.forEach(c => {
        const fondoCliente = getFondoCliente(c);
        const fondoClass = fondoCliente < 0 ? 'fondo-cliente-negativo' : 'fondo-cliente-positivo';
        const estadoTexto = fondoCliente < 0 ? '🔴 DEBE' : fondoCliente > 0 ? '🟢 A FAVOR' : '⚪ AL DÍA';
        const diasInactivo = calcularDiasInactivo(c);
        const esMoroso = esClienteMoroso(c);
        const mensajeAdmin = c.mensajeAdmin || '';
        
        let fechaActualizacion = 'Nunca';
        if (c.fechaActualizacion) {
            const fecha = new Date(c.fechaActualizacion);
            fechaActualizacion = fecha.toLocaleString('es-DO', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        
        html += `<tr class="${esMoroso ? 'cliente-moroso' : ''}">
            <td><code>${c.usuario}</code></td>
            <td><strong>${c.nombre}</strong> ${mensajeAdmin ? '<i class="fa-solid fa-bell" style="color: #f39c12;" title="' + mensajeAdmin + '"></i>' : ''}</td>
            <td>${bancas[c.banca]?.nombre || c.banca}</td>
            <td><a href="https://wa.me/${c.whatsapp}" class="whatsapp-btn" target="_blank">📱 ${c.whatsapp}</a></td>
            <td class="${c.deuda > 0 ? 'text-danger' : 'text-success'}">RD$ ${(c.deuda || 0).toFixed(2)}</td>
            <td class="${fondoClass}">RD$ ${Math.abs(c.fondo || 0).toFixed(2)}</td>
            <td><span class="badge ${fondoCliente < 0 ? 'danger' : fondoCliente > 0 ? 'success' : 'info'}">${estadoTexto}</span></td>
            <td>${fechaActualizacion}</td>
            <td>
                <button class="btn btn-primary btn-sm" onclick="editarCliente('${c.id}')" title="Editar"><i class="fa-solid fa-edit"></i></button>
                <button class="btn btn-warning btn-sm" onclick="abrirModalPremioCliente('${c.id}')" title="Registrar Premio"><i class="fa-solid fa-trophy"></i></button>
                <button class="btn btn-info btn-sm" onclick="verHistorialCliente('${c.id}')" title="Ver Historial"><i class="fa-solid fa-history"></i></button>
                <button class="btn btn-success btn-sm" onclick="abrirPagoCliente('${c.id}')" title="Registrar Pago"><i class="fa-solid fa-dollar-sign"></i></button>
                ${(c.fondo || 0) > 0 ? `
                <button class="btn btn-warning btn-sm" onclick="abrirRetiroCliente('${c.id}')" title="Retirar Fondo"><i class="fa-solid fa-hand-holding-heart"></i></button>
                ` : ''}
                <button class="btn btn-danger btn-sm" onclick="eliminarCliente('${c.id}')" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>`;
    });

    if (clientes.length === 0) {
        html += `<tr><td colspan="9" style="text-align:center;">No hay clientes registrados</td></tr>`;
    }

    html += `</tbody></table></div>`;
    document.getElementById('contentArea').innerHTML = html;
};

window.abrirModalNuevoCliente = function() {
    document.getElementById('modalClienteTitulo').textContent = '➕ Nuevo Cliente';
    document.getElementById('clienteId').value = '';
    document.getElementById('clienteNombre').value = '';
    document.getElementById('clienteUsuario').value = '';
    document.getElementById('clienteWhatsapp').value = '';
    document.getElementById('clienteBanca').value = 'kiko1';
    document.getElementById('clienteDeuda').value = '0';
    document.getElementById('clienteFondo').value = '0';
    document.getElementById('clienteMensaje').value = '';
    abrirModal('modalCliente');
};

window.editarCliente = function(id) {
    const cli = clientes.find(c => c.id === id);
    if (!cli) return;

    document.getElementById('modalClienteTitulo').textContent = '✏️ Editar Cliente';
    document.getElementById('clienteId').value = id;
    document.getElementById('clienteNombre').value = cli.nombre || '';
    document.getElementById('clienteUsuario').value = cli.usuario || '';
    document.getElementById('clienteWhatsapp').value = cli.whatsapp || '';
    document.getElementById('clienteBanca').value = cli.banca || 'kiko1';
    document.getElementById('clienteDeuda').value = cli.deuda || 0;
    document.getElementById('clienteFondo').value = cli.fondo || 0;
    document.getElementById('clienteMensaje').value = cli.mensajeAdmin || '';
    abrirModal('modalCliente');
};

window.guardarCliente = async function() {
    const id = document.getElementById('clienteId').value;
    const nombre = document.getElementById('clienteNombre').value;
    const usuario = document.getElementById('clienteUsuario').value;
    const whatsapp = document.getElementById('clienteWhatsapp').value.replace(/\D/g, '');
    const banca = document.getElementById('clienteBanca').value;
    const deuda = parseFloat(document.getElementById('clienteDeuda').value) || 0;
    const fondo = parseFloat(document.getElementById('clienteFondo').value) || 0;
    const mensajeAdmin = document.getElementById('clienteMensaje').value;

    if (!nombre || !usuario || !whatsapp) {
        return alert('❌ Complete los campos obligatorios');
    }

    const datos = { 
        nombre, usuario, whatsapp, banca, deuda, fondo, mensajeAdmin,
        fechaActualizacion: new Date().toISOString() 
    };

    if (!id) {
        datos.fechaRegistro = new Date().toISOString();
        await db.ref('clientes').push(datos);
    } else {
        await db.ref(`clientes/${id}`).update(datos);
    }

    cerrarModal('modalCliente');
    alert(id ? '✅ Cliente actualizado' : '✅ Cliente creado');
    cargarClientes();
};

window.eliminarCliente = async function(id) {
    if (!confirm('¿Eliminar cliente?')) return;
    await db.ref(`clientes/${id}`).remove();
    cargarClientes();
};

// ========== RETIRO DE FONDO DEL CLIENTE (CORREGIDO) ==========
window.abrirRetiroCliente = function(clienteId) {
    const cliente = clientes.find(c => c.id === clienteId);
    if (!cliente) return;

    const fondoCliente = cliente.fondo || 0;
    if (fondoCliente <= 0) {
        return alert('❌ El cliente no tiene fondo disponible para retirar');
    }

    document.getElementById('retiroClienteInfo').innerHTML = `
        <div style="background:#f8f9fa; padding:15px; border-radius:8px;">
            <p><strong>Cliente:</strong> ${cliente.nombre}</p>
            <p><strong>Fondo disponible:</strong> RD$ ${fondoCliente.toFixed(2)}</p>
            <p><strong>Deuda actual:</strong> RD$ ${(cliente.deuda || 0).toFixed(2)}</p>
            <p><strong>Fondo neto:</strong> RD$ ${getFondoCliente(cliente).toFixed(2)}</p>
        </div>
    `;
    
    document.getElementById('retiroMonto').value = fondoCliente;
    document.getElementById('retiroConcepto').value = 'Retiro de fondo a favor';
    document.getElementById('retiroFecha').value = new Date().toISOString().split('T')[0];
    
    window.clienteRetiro = cliente;
    abrirModal('modalRetiroCliente');
};

window.procesarRetiroCliente = async function() {
    const cliente = window.clienteRetiro;
    if (!cliente) return;

    const monto = parseFloat(document.getElementById('retiroMonto').value) || 0;
    const concepto = document.getElementById('retiroConcepto').value;
    const fecha = document.getElementById('retiroFecha').value;
    const fondoCliente = cliente.fondo || 0;

    if (monto <= 0) return alert('Ingrese un monto válido');
    if (monto > fondoCliente) return alert('El monto no puede ser mayor al fondo disponible');

    const deudaAnterior = cliente.deuda || 0;
    const fondoAnterior = cliente.fondo || 0;
    
    // El retiro reduce el fondo del cliente
    const fondoNuevo = fondoAnterior - monto;
    const deudaNueva = deudaAnterior;

    const hora = new Date().toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' });

    // Registrar el retiro como un gasto de la banca (sale efectivo)
    await db.ref('gastos').push({
        tipo: 'retiro_cliente',
        clienteId: cliente.id,
        clienteNombre: cliente.nombre,
        banca: cliente.banca,
        monto,
        fecha,
        descripcion: concepto,
        fechaRegistro: new Date().toISOString()
    });

    // Registrar la transacción
    await db.ref('deudas').push({
        clienteId: cliente.id,
        clienteNombre: cliente.nombre,
        monto: -monto,
        fecha,
        hora,
        concepto,
        tipo: 'pago',
        formaPago: 'retiro',
        deudaAnterior,
        deudaNueva,
        fondoAnterior,
        fondoNuevo,
        registradoPor: usuarioActual.nombre,
        empleadaId: usuarioActual.id,
        fechaRegistro: new Date().toISOString()
    });

    await db.ref(`clientes/${cliente.id}`).update({
        deuda: deudaNueva,
        fondo: fondoNuevo,
        fechaActualizacion: new Date().toISOString()
    });

    cerrarModal('modalRetiroCliente');
    
    alert(`✅ Retiro procesado. Nuevo fondo del cliente: RD$ ${fondoNuevo.toFixed(2)}`);
    if (usuarioActual.rol === 'admin') {
        cargarClientes();
    } else {
        cargarMisClientes();
    }
};

// ========== VER HISTORIAL DEL CLIENTE ==========
window.verHistorialCliente = function(clienteId) {
    const cliente = clientes.find(c => c.id === clienteId);
    if (!cliente) return;

    const historialDeudas = deudas.filter(d => d.clienteId === clienteId).sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
    const historialPremios = premios.filter(p => p.clienteId === clienteId).sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
    const fondoNeto = getFondoCliente(cliente);
    
    let html = `
        <div class="historial-card">
            <h2>Historial de ${cliente.nombre}</h2>
            ${cliente.mensajeAdmin ? `
            <div class="mensaje-emergente">
                <i class="fa-solid fa-circle-info"></i>
                <strong>📢 Mensaje del Admin:</strong> ${cliente.mensajeAdmin}
            </div>
            ` : ''}
            
            <div class="stats-grid">
                <div class="stat-card primary">
                    <div>
                        <h3>Deuda Actual</h3>
                        <span class="number">RD$ ${(cliente.deuda || 0).toFixed(2)}</span>
                    </div>
                </div>
                <div class="stat-card success">
                    <div>
                        <h3>Fondo</h3>
                        <span class="number">RD$ ${(cliente.fondo || 0).toFixed(2)}</span>
                    </div>
                </div>
                <div class="stat-card ${fondoNeto < 0 ? 'danger' : 'warning'}">
                    <div>
                        <h3>Fondo Neto</h3>
                        <span class="number ${fondoNeto < 0 ? 'text-danger' : 'text-success'}">RD$ ${Math.abs(fondoNeto).toFixed(2)}</span>
                        <br><small>${fondoNeto < 0 ? 'DEBE' : fondoNeto > 0 ? 'A FAVOR' : 'AL DÍA'}</small>
                    </div>
                </div>
            </div>
        </div>
        
        <h3>📋 Movimientos de Deudas/Pagos</h3>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Hora</th>
                        <th>Tipo</th>
                        <th>Forma Pago</th>
                        <th>Monto</th>
                        <th>Concepto</th>
                        <th>Deuda Ant.</th>
                        <th>Deuda Nueva</th>
                        <th>Fondo Ant.</th>
                        <th>Fondo Nuevo</th>
                    </tr>
                </thead>
                <tbody>
                    ${historialDeudas.map(d => `
                        <tr>
                            <td>${d.fecha}</td>
                            <td>${d.hora || ''}</td>
                            <td>${d.tipo === 'deuda' ? '➕ Deuda' : '➖ Pago'}</td>
                            <td>${getFormaPagoIcon(d.formaPago)}</td>
                            <td class="${d.tipo === 'deuda' ? 'text-danger' : 'text-success'}">RD$ ${Math.abs(d.monto).toFixed(2)}</td>
                            <td>${d.concepto || ''}</td>
                            <td>RD$ ${(d.deudaAnterior || 0).toFixed(2)}</td>
                            <td>RD$ ${(d.deudaNueva || 0).toFixed(2)}</td>
                            <td>RD$ ${(d.fondoAnterior || 0).toFixed(2)}</td>
                            <td>RD$ ${(d.fondoNuevo || 0).toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <h3>🏆 Premios</h3>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Loterías</th>
                        <th>Monto</th>
                        <th>Deuda Ant.</th>
                        <th>Deuda Nueva</th>
                        <th>Fondo Nuevo</th>
                    </tr>
                </thead>
                <tbody>
                    ${historialPremios.map(p => `
                        <tr>
                            <td>${p.fecha}</td>
                            <td>${Array.isArray(p.loterias) ? p.loterias.join(', ') : p.loteria || ''}</td>
                            <td class="text-success">RD$ ${p.monto.toFixed(2)}</td>
                            <td>RD$ ${(p.deudaAnterior || 0).toFixed(2)}</td>
                            <td>RD$ ${(p.deudaNueva || 0).toFixed(2)}</td>
                            <td>RD$ ${(p.fondoNuevo || 0).toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    document.getElementById('contentArea').innerHTML = html;
};

function getFormaPagoIcon(formaPago) {
    const icons = {
        'efectivo': '💵 Efectivo',
        'transferencia': '🏦 Transferencia',
        'fondo': '💰 Fondo',
        'retiro': '💸 Retiro',
        'mixto': '🔄 Mixto'
    };
    return icons[formaPago] || '💵 Efectivo';
}

// ========== DEUDAS (CORREGIDO) ==========
window.abrirModalDeuda = function() {
    document.getElementById('deudaId').value = '';
    document.getElementById('deudaMonto').value = '';
    document.getElementById('deudaFecha').value = new Date().toISOString().split('T')[0];
    document.getElementById('deudaConcepto').value = '';
    document.getElementById('fondoInfo').style.display = 'none';

    let options = '<option value="">Seleccionar cliente</option>';
    const misClientes = usuarioActual.rol === 'empleada' 
        ? clientes.filter(c => c.banca === usuarioActual.banca)
        : clientes;
    
    misClientes.forEach(c => {
        const fondoCliente = c.fondo || 0;
        const fondoNeto = getFondoCliente(c);
        options += `<option value="${c.id}" data-fondo="${fondoCliente}" data-deuda="${c.deuda || 0}" data-fondoneto="${fondoNeto}">${c.nombre} (Deuda: RD$ ${(c.deuda || 0).toFixed(2)} | Fondo: RD$ ${fondoCliente.toFixed(2)} | Neto: RD$ ${fondoNeto.toFixed(2)})</option>`;
    });
    document.getElementById('deudaCliente').innerHTML = options;
    
    document.getElementById('deudaCliente').addEventListener('change', function() {
        const selected = this.options[this.selectedIndex];
        const fondo = parseFloat(selected.dataset.fondo) || 0;
        
        if (fondo > 0 && document.getElementById('deudaTipo').value === 'pago') {
            document.getElementById('fondoInfo').style.display = 'block';
            document.getElementById('fondoMonto').textContent = `RD$ ${fondo.toFixed(2)}`;
        } else {
            document.getElementById('fondoInfo').style.display = 'none';
        }
    });
    
    abrirModal('modalDeuda');
};

document.getElementById('deudaTipo')?.addEventListener('change', function() {
    const select = document.getElementById('deudaCliente');
    const selected = select.options[select.selectedIndex];
    if (selected && selected.value) {
        const fondo = parseFloat(selected.dataset.fondo) || 0;
        
        if (this.value === 'pago' && fondo > 0) {
            document.getElementById('fondoInfo').style.display = 'block';
            document.getElementById('fondoMonto').textContent = `RD$ ${fondo.toFixed(2)}`;
        } else {
            document.getElementById('fondoInfo').style.display = 'none';
        }
    }
});

document.getElementById('formaPago')?.addEventListener('change', function() {
    const select = document.getElementById('deudaCliente');
    const selected = select.options[select.selectedIndex];
    if (selected && selected.value) {
        const fondo = parseFloat(selected.dataset.fondo) || 0;
        
        if (this.value === 'fondo' && fondo > 0) {
            document.getElementById('fondoInfo').style.display = 'block';
            document.getElementById('fondoMonto').textContent = `RD$ ${fondo.toFixed(2)}`;
        } else {
            document.getElementById('fondoInfo').style.display = 'none';
        }
    }
});

window.guardarDeuda = async function() {
    const clienteId = document.getElementById('deudaCliente').value;
    const tipo = document.getElementById('deudaTipo').value;
    const formaPago = document.getElementById('formaPago').value;
    const monto = parseFloat(document.getElementById('deudaMonto').value);
    const fecha = document.getElementById('deudaFecha').value;
    const concepto = document.getElementById('deudaConcepto').value;

    if (!clienteId || !monto) return alert('Complete los campos');

    const cliente = clientes.find(c => c.id === clienteId);
    const deudaAnterior = cliente.deuda || 0;
    const fondoAnterior = cliente.fondo || 0;
    let deudaNueva = deudaAnterior;
    let fondoNuevo = fondoAnterior;

    if (tipo === 'deuda') {
        // Aumentar deuda
        deudaNueva = deudaAnterior + monto;
        
        // Si hay fondo, primero se usa el fondo para cubrir la deuda
        if (fondoAnterior > 0) {
            const usarFondo = Math.min(monto, fondoAnterior);
            fondoNuevo = fondoAnterior - usarFondo;
            deudaNueva = deudaAnterior + (monto - usarFondo);
        }
    } else {
        // Es un pago
        if (formaPago === 'fondo') {
            // Usa el fondo del cliente
            if (monto > fondoAnterior) {
                return alert(`❌ El cliente solo tiene RD$ ${fondoAnterior.toFixed(2)} de fondo disponible`);
            }
            fondoNuevo = fondoAnterior - monto;
            deudaNueva = deudaAnterior;
            
            // El dinero queda en la banca (aumenta fondo)
            bancas[cliente.banca].fondo = (bancas[cliente.banca].fondo || 0) + monto;
            await db.ref(`fondos_bancas/${cliente.banca}`).set(bancas[cliente.banca]);
            
        } else {
            // Pago normal (reduce deuda)
            deudaNueva = Math.max(0, deudaAnterior - monto);
            
            // Si el pago es mayor que la deuda, el sobrante va a fondo
            if (monto > deudaAnterior) {
                const sobrante = monto - deudaAnterior;
                fondoNuevo = fondoAnterior + sobrante;
                deudaNueva = 0;
            }
            
            // El dinero ingresa a la banca
            bancas[cliente.banca].fondo = (bancas[cliente.banca].fondo || 0) + monto;
            await db.ref(`fondos_bancas/${cliente.banca}`).set(bancas[cliente.banca]);
        }
    }

    const hora = new Date().toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' });

    await db.ref('deudas').push({
        clienteId, clienteNombre: cliente.nombre, 
        monto: tipo === 'deuda' ? monto : -monto,
        fecha, hora, concepto,
        tipo, formaPago,
        deudaAnterior, deudaNueva,
        fondoAnterior, fondoNuevo,
        registradoPor: usuarioActual.nombre, 
        empleadaId: usuarioActual.id,
        fechaRegistro: new Date().toISOString()
    });

    await db.ref(`clientes/${clienteId}`).update({
        deuda: deudaNueva,
        fondo: fondoNuevo,
        fechaActualizacion: new Date().toISOString()
    });

    alert(`✅ Registrado. Nueva deuda: RD$ ${deudaNueva.toFixed(2)} | Nuevo fondo: RD$ ${fondoNuevo.toFixed(2)}`);
    cerrarModal('modalDeuda');
    
    if (usuarioActual.rol === 'empleada') {
        cargarMisClientes();
    } else {
        cargarClientes();
    }
};

// ========== PREMIOS (CORREGIDO) ==========
window.abrirModalPremio = function() {
    document.getElementById('premioId').value = '';
    document.getElementById('premioMonto').value = '';
    document.getElementById('premioFecha').value = new Date().toISOString().split('T')[0];

    let options = '<option value="">Seleccionar cliente</option>';
    const misClientes = usuarioActual.rol === 'empleada'
        ? clientes.filter(c => c.banca === usuarioActual.banca)
        : clientes;
        
    misClientes.forEach(c => {
        const fondoNeto = getFondoCliente(c);
        options += `<option value="${c.id}">${c.nombre} (Deuda: RD$ ${(c.deuda || 0).toFixed(2)} | Fondo: RD$ ${(c.fondo || 0).toFixed(2)} | Neto: RD$ ${fondoNeto.toFixed(2)})</option>`;
    });
    document.getElementById('premioCliente').innerHTML = options;

    const loterias = ['Loteka', 'La Primera', 'Lotería Nacional', 'Lotería Real', 'Lotería Electrónica', 'Leidsa'];
    let checkHTML = '';
    loterias.forEach(l => {
        checkHTML += `<label class="checkbox-item"><input type="checkbox" value="${l}"> ${l}</label>`;
    });
    document.getElementById('loteriasCheckbox').innerHTML = checkHTML;
    abrirModal('modalPremio');
};

window.abrirModalPremioCliente = function(clienteId) {
    abrirModalPremio();
    document.getElementById('premioCliente').value = clienteId;
};

window.guardarPremio = async function() {
    const clienteId = document.getElementById('premioCliente').value;
    const monto = parseFloat(document.getElementById('premioMonto').value);
    const fecha = document.getElementById('premioFecha').value;

    const loterias = [];
    document.querySelectorAll('#loteriasCheckbox input:checked').forEach(cb => loterias.push(cb.value));

    if (!clienteId || !monto || loterias.length === 0) return alert('Complete todos los campos');

    const cliente = clientes.find(c => c.id === clienteId);
    const deudaAnterior = cliente.deuda || 0;
    const fondoAnterior = cliente.fondo || 0;
    let deudaNueva = deudaAnterior;
    let fondoNuevo = fondoAnterior;
    
    // El premio primero paga la deuda, el sobrante va a fondo
    if (monto > deudaAnterior) {
        fondoNuevo = fondoAnterior + (monto - deudaAnterior);
        deudaNueva = 0;
    } else {
        deudaNueva = deudaAnterior - monto;
    }

    await db.ref('premios').push({
        clienteId, clienteNombre: cliente.nombre, loterias, monto, fecha,
        deudaAnterior, deudaNueva, fondoNuevo,
        registradoPor: usuarioActual.nombre, empleadaId: usuarioActual.id,
        fechaRegistro: new Date().toISOString()
    });

    await db.ref(`clientes/${clienteId}`).update({
        deuda: deudaNueva,
        fondo: fondoNuevo,
        ultimoPremio: fecha,
        fechaActualizacion: new Date().toISOString()
    });

    alert(`✅ Premio registrado. Deuda actual: RD$ ${deudaNueva.toFixed(2)} | Fondo actual: RD$ ${fondoNuevo.toFixed(2)}`);
    cerrarModal('modalPremio');
};

// ========== PAGO DE CLIENTE (NUEVO) ==========
window.abrirPagoCliente = function(clienteId) {
    const cliente = clientes.find(c => c.id === clienteId);
    if (!cliente) return;

    const fondoCliente = cliente.fondo || 0;
    const deudaCliente = cliente.deuda || 0;

    let html = `
        <div class="modal" id="modalPagoCliente">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>💰 Pago de Cliente: ${cliente.nombre}</h3>
                    <button class="modal-close" onclick="cerrarModal('modalPagoCliente')">&times;</button>
                </div>
                
                <div class="stats-grid" style="margin-bottom:20px;">
                    <div class="stat-card primary"><div><h3>Deuda Actual</h3><span class="number">RD$ ${deudaCliente.toFixed(2)}</span></div></div>
                    <div class="stat-card success"><div><h3>Fondo Cliente</h3><span class="number">RD$ ${fondoCliente.toFixed(2)}</span></div></div>
                </div>

                <div class="form-group">
                    <label>Monto a pagar (RD$):</label>
                    <input type="number" id="pagoMonto" class="form-control" min="0" step="0.01" value="${deudaCliente}">
                </div>
                
                <div class="form-group">
                    <label>Forma de Pago:</label>
                    <select id="pagoForma" class="form-control">
                        <option value="efectivo">💵 Efectivo</option>
                        <option value="transferencia">🏦 Transferencia</option>
                        ${fondoCliente > 0 ? '<option value="fondo">💰 Usar Fondo del Cliente</option>' : ''}
                        <option value="mixto">🔄 Mixto</option>
                    </select>
                </div>

                <div id="pagoTransferenciaDetalle" style="display:none;">
                    <div class="form-group">
                        <label>Banco Origen</label>
                        <input type="text" id="pagoBancoOrigen" class="form-control" placeholder="Ej: Banco Popular">
                    </div>
                    <div class="form-group">
                        <label>Banco Destino</label>
                        <input type="text" id="pagoBancoDestino" class="form-control" placeholder="Ej: BHD León">
                    </div>
                    <div class="form-group">
                        <label>Número de Referencia</label>
                        <input type="text" id="pagoReferencia" class="form-control" placeholder="Ej: 123456789">
                    </div>
                </div>

                <div class="form-group">
                    <label>Concepto:</label>
                    <input type="text" id="pagoConcepto" class="form-control" value="Pago de deuda">
                </div>
                <div class="form-group">
                    <label>Fecha:</label>
                    <input type="date" id="pagoFecha" class="form-control" value="${new Date().toISOString().split('T')[0]}">
                </div>

                <div class="modal-footer">
                    <button class="btn btn-success" onclick="procesarPagoCliente('${clienteId}')">💸 Procesar Pago</button>
                    <button class="btn btn-danger" onclick="cerrarModal('modalPagoCliente')">✖ Cancelar</button>
                </div>
            </div>
        </div>
    `;

    const modalDiv = document.createElement('div');
    modalDiv.innerHTML = html;
    document.body.appendChild(modalDiv);
    
    document.getElementById('pagoForma').addEventListener('change', function() {
        document.getElementById('pagoTransferenciaDetalle').style.display = 
            this.value === 'transferencia' || this.value === 'mixto' ? 'block' : 'none';
    });
    
    abrirModal('modalPagoCliente');
};

window.procesarPagoCliente = async function(clienteId) {
    const cliente = clientes.find(c => c.id === clienteId);
    if (!cliente) return;

    const monto = parseFloat(document.getElementById('pagoMonto').value) || 0;
    const formaPago = document.getElementById('pagoForma').value;
    const concepto = document.getElementById('pagoConcepto').value;
    const fecha = document.getElementById('pagoFecha').value;

    if (monto <= 0) return alert('Ingrese un monto válido');

    const deudaAnterior = cliente.deuda || 0;
    const fondoAnterior = cliente.fondo || 0;
    let deudaNueva = deudaAnterior;
    let fondoNuevo = fondoAnterior;

    // Procesar según la forma de pago
    if (formaPago === 'fondo') {
        // Paga con fondo del cliente
        if (monto > fondoAnterior) {
            return alert(`❌ El cliente solo tiene RD$ ${fondoAnterior.toFixed(2)} de fondo`);
        }
        fondoNuevo = fondoAnterior - monto;
        deudaNueva = deudaAnterior;
        
        // El dinero pasa a la banca
        bancas[cliente.banca].fondo = (bancas[cliente.banca].fondo || 0) + monto;
        await db.ref(`fondos_bancas/${cliente.banca}`).set(bancas[cliente.banca]);
        
    } else {
        // Pago normal (reduce deuda)
        deudaNueva = Math.max(0, deudaAnterior - monto);
        
        // Si el pago es mayor que la deuda, el sobrante va a fondo
        if (monto > deudaAnterior) {
            const sobrante = monto - deudaAnterior;
            fondoNuevo = fondoAnterior + sobrante;
            deudaNueva = 0;
        }
        
        // El dinero ingresa a la banca
        bancas[cliente.banca].fondo = (bancas[cliente.banca].fondo || 0) + monto;
        await db.ref(`fondos_bancas/${cliente.banca}`).set(bancas[cliente.banca]);

        // Si es transferencia, registrar detalles
        if (formaPago === 'transferencia' || formaPago === 'mixto') {
            const bancoOrigen = document.getElementById('pagoBancoOrigen')?.value || '';
            const bancoDestino = document.getElementById('pagoBancoDestino')?.value || '';
            const referencia = document.getElementById('pagoReferencia')?.value || '';
            
            await db.ref('transferencias').push({
                tipo: 'pago_cliente',
                clienteId,
                clienteNombre: cliente.nombre,
                banca: cliente.banca,
                monto,
                fecha,
                bancoOrigen,
                bancoDestino,
                referencia,
                concepto,
                registradoPor: usuarioActual.nombre,
                empleadaId: usuarioActual.id,
                fechaRegistro: new Date().toISOString()
            });
        }
    }

    // Registrar la transacción
    const hora = new Date().toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' });
    
    await db.ref('deudas').push({
        clienteId,
        clienteNombre: cliente.nombre,
        monto: -monto,
        fecha,
        hora,
        concepto,
        tipo: 'pago',
        formaPago,
        deudaAnterior,
        deudaNueva,
        fondoAnterior,
        fondoNuevo,
        registradoPor: usuarioActual.nombre,
        empleadaId: usuarioActual.id,
        fechaRegistro: new Date().toISOString()
    });

    await db.ref(`clientes/${clienteId}`).update({
        deuda: deudaNueva,
        fondo: fondoNuevo,
        fechaActualizacion: new Date().toISOString()
    });

    cerrarModal('modalPagoCliente');
    document.getElementById('modalPagoCliente')?.remove();
    
    alert(`✅ Pago registrado. Nueva deuda: RD$ ${deudaNueva.toFixed(2)} | Nuevo fondo: RD$ ${fondoNuevo.toFixed(2)}`);
    
    if (usuarioActual.rol === 'empleada') {
        cargarMisClientes();
    } else {
        cargarClientes();
    }
};

// ========== CUADRE DE BANCA (EMPLEADA) - MEJORADO ==========
window.abrirCuadreBanca = function() {
    const hoy = new Date();
    const hace7dias = new Date(hoy);
    hace7dias.setDate(hoy.getDate() - 7);
    
    document.getElementById('cuadreFechaDesde').value = hace7dias.toISOString().split('T')[0];
    document.getElementById('cuadreFechaHasta').value = hoy.toISOString().split('T')[0];
    
    const banca = bancas[usuarioActual.banca];
    document.getElementById('fondoBaseBanca').value = banca?.fondo || 0;
    
    // Cargar último cuadre del admin
    const cuadresBancaAdmin = cuadresAdmin
        .filter(c => c.banca === usuarioActual.banca)
        .sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
    
    if (cuadresBancaAdmin.length > 0) {
        const ultimo = cuadresBancaAdmin[0];
        document.getElementById('ultimoCuadreAdminFecha').textContent = ultimo.fecha;
        document.getElementById('ultimoCuadreAdminComision').textContent = `RD$ ${(ultimo.ventaComision || 0).toFixed(2)}`;
        document.getElementById('ultimoCuadreAdminCentral').textContent = `RD$ ${(ultimo.ventaCentral || 0).toFixed(2)}`;
        document.getElementById('ultimoCuadreAdminRecargas').textContent = `RD$ ${(ultimo.recargasExternas || 0).toFixed(2)}`;
    }
    
    // Limpiar campos
    ['ventaComision', 'ventaCentral', 'recargasExternas', 'ticketsPendientesMonto'].forEach(id => {
        document.getElementById(id).value = '0';
    });
    
    ['billete2000','billete1000','billete500','billete200','billete100','billete50','moneda25','moneda10','moneda5','moneda1'].forEach(id => {
        document.getElementById(id).value = '0';
    });

    cargarDatosRangoBanca();
    calcularEfectivo();
    abrirModal('modalCuadreBanca');
};

window.cargarDatosRangoBanca = function() {
    const desde = document.getElementById('cuadreFechaDesde').value;
    const hasta = document.getElementById('cuadreFechaHasta').value;
    if (!desde || !hasta) return;

    // Préstamos a Comisión
    const prestamosComision = prestamos
        .filter(p => p.banca === usuarioActual.banca && p.tipo === 'kiko_comision' && p.fecha >= desde && p.fecha <= hasta)
        .reduce((s,p) => s + (p.monto || 0), 0);
    document.getElementById('prestamosComision').textContent = `RD$ ${prestamosComision.toFixed(2)}`;

    // Préstamos a Central
    const prestamosCentral = prestamos
        .filter(p => p.banca === usuarioActual.banca && p.tipo === 'central' && p.fecha >= desde && p.fecha <= hasta)
        .reduce((s,p) => s + (p.monto || 0), 0);
    document.getElementById('prestamosCentral').textContent = `RD$ ${prestamosCentral.toFixed(2)}`;

    // Devoluciones a Clientes
    const devoluciones = deudas
        .filter(d => {
            const cliente = clientes.find(c => c.id === d.clienteId);
            return cliente?.banca === usuarioActual.banca && d.tipo === 'pago' && d.fecha >= desde && d.fecha <= hasta;
        })
        .reduce((s,d) => s + Math.abs(d.monto), 0);
    document.getElementById('devolucionesPeriodo').textContent = `RD$ ${devoluciones.toFixed(2)}`;

    // Transferencias/Depósitos
    const transferenciasPeriodo = transferencias
        .filter(t => t.banca === usuarioActual.banca && t.fecha >= desde && t.fecha <= hasta)
        .reduce((s,t) => s + (t.monto || 0), 0);
    document.getElementById('transferenciasPeriodo').textContent = `RD$ ${transferenciasPeriodo.toFixed(2)}`;

    // Gastos
    const gastosPeriodo = gastos
        .filter(g => g.banca === usuarioActual.banca && g.fecha >= desde && g.fecha <= hasta)
        .reduce((s,g) => s + (g.monto || 0), 0);
    document.getElementById('gastosPeriodo').textContent = `RD$ ${gastosPeriodo.toFixed(2)}`;

    // Deuda Total Clientes
    const clientesBanca = clientes.filter(c => c.banca === usuarioActual.banca);
    const deudaClientes = clientesBanca.reduce((s,c) => s + (c.deuda || 0), 0);
    document.getElementById('deudaClientesTotal').textContent = `RD$ ${deudaClientes.toFixed(2)}`;

    calcularCuadreBanca();
};

window.calcularEfectivo = function() {
    const denominaciones = [
        { id: 'billete2000', valor: 2000 },
        { id: 'billete1000', valor: 1000 },
        { id: 'billete500', valor: 500 },
        { id: 'billete200', valor: 200 },
        { id: 'billete100', valor: 100 },
        { id: 'billete50', valor: 50 },
        { id: 'moneda25', valor: 25 },
        { id: 'moneda10', valor: 10 },
        { id: 'moneda5', valor: 5 },
        { id: 'moneda1', valor: 1 }
    ];

    let total = 0;
    denominaciones.forEach(d => {
        const cantidad = parseInt(document.getElementById(d.id)?.value) || 0;
        total += d.valor * cantidad;
    });

    document.getElementById('totalEfectivo').textContent = `RD$ ${total.toFixed(2)}`;
    calcularCuadreBanca();
};

window.calcularCuadreBanca = function() {
    const totalEfectivo = parseFloat(document.getElementById('totalEfectivo')?.textContent.replace('RD$ ', '')) || 0;
    const fondoBase = parseFloat(document.getElementById('fondoBaseBanca').value) || 0;
    document.getElementById('fondoBaseDisplay').textContent = `RD$ ${fondoBase.toFixed(2)}`;
    
    // Datos automáticos
    const prestamosComision = parseFloat(document.getElementById('prestamosComision').textContent.replace('RD$ ', '')) || 0;
    const prestamosCentral = parseFloat(document.getElementById('prestamosCentral').textContent.replace('RD$ ', '')) || 0;
    const devoluciones = parseFloat(document.getElementById('devolucionesPeriodo').textContent.replace('RD$ ', '')) || 0;
    const transferenciasTotal = parseFloat(document.getElementById('transferenciasPeriodo').textContent.replace('RD$ ', '')) || 0;
    const gastosTotal = parseFloat(document.getElementById('gastosPeriodo').textContent.replace('RD$ ', '')) || 0;
    
    // Datos digitados por empleada
    const ventaComision = parseFloat(document.getElementById('ventaComision').value) || 0;
    const ventaCentral = parseFloat(document.getElementById('ventaCentral').value) || 0;
    const recargasExternas = parseFloat(document.getElementById('recargasExternas').value) || 0;
    const ticketsPendientes = parseFloat(document.getElementById('ticketsPendientesMonto').value) || 0;

    // SUMA (lo que incrementa el fondo)
    const suma = ventaComision + ventaCentral + recargasExternas + prestamosComision + prestamosCentral;
    
    // RESTA (lo que disminuye el fondo)
    const resta = devoluciones + transferenciasTotal + gastosTotal + ticketsPendientes;

    const deberiaHaber = fondoBase + suma - resta;
    
    const diferencia = totalEfectivo - deberiaHaber;
    
    const fondoNuevo = totalEfectivo;

    document.getElementById('totalSuma').textContent = `RD$ ${suma.toFixed(2)}`;
    document.getElementById('totalResta').textContent = `RD$ ${resta.toFixed(2)}`;
    document.getElementById('totalDeberia').textContent = `RD$ ${deberiaHaber.toFixed(2)}`;
    document.getElementById('diferenciaCuadre').textContent = `RD$ ${diferencia.toFixed(2)}`;
    document.getElementById('fondoNuevo').textContent = `RD$ ${fondoNuevo.toFixed(2)}`;
    
    let estado = '✅ NORMAL';
    let color = '#27ae60';
    
    if (Math.abs(diferencia) > 0.01) {
        if (diferencia > 0) {
            estado = '⚠️ SOBRA';
            color = '#f39c12';
        } else {
            estado = '❌ FALTA';
            color = '#e74c3c';
        }
    }
    
    document.getElementById('estadoCuadre').textContent = estado;
    document.getElementById('estadoCuadre').style.color = color;
    document.getElementById('diferenciaCuadre').style.color = color;
    
    return { diferencia, estado };
};

window.guardarCuadreBanca = async function() {
    const desde = document.getElementById('cuadreFechaDesde').value;
    const hasta = document.getElementById('cuadreFechaHasta').value;
    if (!desde || !hasta) return alert('Seleccione rango de fechas');

    const totalEfectivo = parseFloat(document.getElementById('totalEfectivo').textContent.replace('RD$ ', '')) || 0;
    const diferencia = parseFloat(document.getElementById('diferenciaCuadre').textContent.replace('RD$ ', '')) || 0;
    const estado = document.getElementById('estadoCuadre').textContent;
    
    const ventaComision = parseFloat(document.getElementById('ventaComision').value) || 0;
    const ventaCentral = parseFloat(document.getElementById('ventaCentral').value) || 0;
    const recargasExternas = parseFloat(document.getElementById('recargasExternas').value) || 0;
    const ticketsPendientes = parseFloat(document.getElementById('ticketsPendientesMonto').value) || 0;
    
    const prestamosComision = parseFloat(document.getElementById('prestamosComision').textContent.replace('RD$ ', '')) || 0;
    const prestamosCentral = parseFloat(document.getElementById('prestamosCentral').textContent.replace('RD$ ', '')) || 0;
    const devoluciones = parseFloat(document.getElementById('devolucionesPeriodo').textContent.replace('RD$ ', '')) || 0;
    const transferenciasTotal = parseFloat(document.getElementById('transferenciasPeriodo').textContent.replace('RD$ ', '')) || 0;
    const gastosTotal = parseFloat(document.getElementById('gastosPeriodo').textContent.replace('RD$ ', '')) || 0;

    const billetes = {};
    const denominaciones = ['2000','1000','500','200','100','50','25','10','5','1'];
    denominaciones.forEach(d => {
        const id = d >= 25 ? `billete${d}` : `moneda${d}`;
        billetes[d] = parseInt(document.getElementById(id).value) || 0;
    });

    const cuadre = {
        empleadaId: usuarioActual.id,
        empleadaNombre: usuarioActual.nombre,
        banca: usuarioActual.banca,
        fechaDesde: desde,
        fechaHasta: hasta,
        fondoInicial: parseFloat(document.getElementById('fondoBaseBanca').value) || 0,
        ventaComision,
        ventaCentral,
        recargasExternas,
        ticketsPendientes,
        prestamosComision,
        prestamosCentral,
        devoluciones,
        transferencias: transferenciasTotal,
        gastos: gastosTotal,
        totalEfectivo,
        diferencia,
        estado,
        billetes,
        fechaRegistro: new Date().toISOString()
    };

    await db.ref('cuadres_banca').push(cuadre);
    
    // Actualizar fondo de la banca
    bancas[usuarioActual.banca].fondo = totalEfectivo;
    bancas[usuarioActual.banca].ultimoCuadre = hasta;
    bancas[usuarioActual.banca].historial = bancas[usuarioActual.banca].historial || [];
    bancas[usuarioActual.banca].historial.push({ fecha: hasta, fondo: totalEfectivo });
    
    await db.ref(`fondos_bancas/${usuarioActual.banca}`).set(bancas[usuarioActual.banca]);
    
    if (estado.includes('FALTA')) {
        await db.ref('faltantes').push({
            empleadaId: usuarioActual.id,
            empleadaNombre: usuarioActual.nombre,
            banca: usuarioActual.banca,
            fecha: hasta,
            monto: Math.abs(diferencia),
            cuadreId: cuadre.id,
            descontado: false,
            fechaRegistro: new Date().toISOString()
        });
        
        alert(`⚠️ Hay un faltante de RD$ ${Math.abs(diferencia).toFixed(2)}. Será descontado de su nómina.`);
    }
    
    alert('✅ Cuadre guardado');
    cerrarModal('modalCuadreBanca');
};

// ========== CUADRE ADMIN - MEJORADO ==========
window.abrirModalCuadreAdmin = function() {
    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
    const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).toISOString().split('T')[0];
    
    document.getElementById('cuadreAdminDesde').value = inicioMes;
    document.getElementById('cuadreAdminHasta').value = finMes;
    
    // Limpiar campos
    document.getElementById('adminVentaComision').value = '0';
    document.getElementById('adminVentaCentral').value = '0';
    document.getElementById('adminRecargasExternas').value = '0';
    
    cargarDatosAdmin();
    abrirModal('modalCuadreAdmin');
};

window.cargarDatosAdmin = function() {
    const desde = document.getElementById('cuadreAdminDesde').value;
    const hasta = document.getElementById('cuadreAdminHasta').value;
    const banca = document.getElementById('cuadreAdminBanca').value;
    
    if (!desde || !hasta) return;
    
    const cuadresAnteriores = cuadresAdmin
        .filter(c => c.banca === banca && c.fecha < desde)
        .sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
    
    const fondoInicial = cuadresAnteriores.length > 0 ? cuadresAnteriores[0].fondoFinal : (bancas[banca]?.fondo || 0);
    document.getElementById('adminFondoInicial').textContent = `RD$ ${fondoInicial.toFixed(2)}`;
    
    // Préstamos
    const prestamosKiko = prestamos
        .filter(p => p.banca === banca && p.tipo === 'kiko_comision' && p.fecha >= desde && p.fecha <= hasta)
        .reduce((s,p) => s + (p.monto || 0), 0);
    document.getElementById('adminPrestamosKiko').textContent = `RD$ ${prestamosKiko.toFixed(2)}`;
    
    const prestamosCentral = prestamos
        .filter(p => p.banca === banca && p.tipo === 'central' && p.fecha >= desde && p.fecha <= hasta)
        .reduce((s,p) => s + (p.monto || 0), 0);
    document.getElementById('adminPrestamosCentral').textContent = `RD$ ${prestamosCentral.toFixed(2)}`;
    
    // Devoluciones
    const devoluciones = deudas
        .filter(d => {
            const cliente = clientes.find(c => c.id === d.clienteId);
            return cliente?.banca === banca && d.tipo === 'pago' && d.fecha >= desde && d.fecha <= hasta;
        })
        .reduce((s,d) => s + Math.abs(d.monto), 0);
    document.getElementById('adminDevoluciones').textContent = `RD$ ${devoluciones.toFixed(2)}`;
    
    // Transferencias
    const transferenciasTotal = transferencias
        .filter(t => t.banca === banca && t.fecha >= desde && t.fecha <= hasta)
        .reduce((s,t) => s + (t.monto || 0), 0);
    document.getElementById('adminTransferencias').textContent = `RD$ ${transferenciasTotal.toFixed(2)}`;
    
    // Gastos
    const gastosTotal = gastos
        .filter(g => g.banca === banca && g.fecha >= desde && g.fecha <= hasta)
        .reduce((s,g) => s + (g.monto || 0), 0);
    document.getElementById('adminGastos').textContent = `RD$ ${gastosTotal.toFixed(2)}`;
    
    // Deuda clientes
    const clientesBanca = clientes.filter(c => c.banca === banca);
    const deudaClientes = clientesBanca.reduce((s,c) => s + (c.deuda || 0), 0);
    document.getElementById('adminDeudaClientes').textContent = `RD$ ${deudaClientes.toFixed(2)}`;
    
    calcularCuadreAdmin();
};

window.calcularCuadreAdmin = function() {
    const fondoInicial = parseFloat(document.getElementById('adminFondoInicial').textContent.replace('RD$ ', '')) || 0;
    const prestamosKiko = parseFloat(document.getElementById('adminPrestamosKiko').textContent.replace('RD$ ', '')) || 0;
    const prestamosCentral = parseFloat(document.getElementById('adminPrestamosCentral').textContent.replace('RD$ ', '')) || 0;
    const devoluciones = parseFloat(document.getElementById('adminDevoluciones').textContent.replace('RD$ ', '')) || 0;
    const transferenciasTotal = parseFloat(document.getElementById('adminTransferencias').textContent.replace('RD$ ', '')) || 0;
    const gastosTotal = parseFloat(document.getElementById('adminGastos').textContent.replace('RD$ ', '')) || 0;
    
    // Datos digitados por admin
    const ventaComision = parseFloat(document.getElementById('adminVentaComision').value) || 0;
    const ventaCentral = parseFloat(document.getElementById('adminVentaCentral').value) || 0;
    const recargasExternas = parseFloat(document.getElementById('adminRecargasExternas').value) || 0;

    // SUMA
    const suma = ventaComision + ventaCentral + recargasExternas + prestamosKiko + prestamosCentral;
    
    // RESTA
    const resta = devoluciones + transferenciasTotal + gastosTotal;

    const deberiaHaber = fondoInicial + suma - resta;
    const fondoFinal = deberiaHaber;
    
    document.getElementById('adminTotalSuma').textContent = `RD$ ${suma.toFixed(2)}`;
    document.getElementById('adminTotalResta').textContent = `RD$ ${resta.toFixed(2)}`;
    document.getElementById('adminTotalDeberia').textContent = `RD$ ${deberiaHaber.toFixed(2)}`;
    document.getElementById('adminFondoFinal').textContent = `RD$ ${fondoFinal.toFixed(2)}`;
    document.getElementById('adminComisionFinal').textContent = `RD$ ${ventaComision.toFixed(2)}`;
    document.getElementById('adminCentralFinal').textContent = `RD$ ${ventaCentral.toFixed(2)}`;
    
    return { fondoInicial, suma, resta, fondoFinal };
};

window.guardarCuadreAdmin = async function() {
    const desde = document.getElementById('cuadreAdminDesde').value;
    const hasta = document.getElementById('cuadreAdminHasta').value;
    const banca = document.getElementById('cuadreAdminBanca').value;
    
    if (!desde || !hasta) return alert('Seleccione rango de fechas');
    
    const fondoInicial = parseFloat(document.getElementById('adminFondoInicial').textContent.replace('RD$ ', '')) || 0;
    const prestamosKiko = parseFloat(document.getElementById('adminPrestamosKiko').textContent.replace('RD$ ', '')) || 0;
    const prestamosCentral = parseFloat(document.getElementById('adminPrestamosCentral').textContent.replace('RD$ ', '')) || 0;
    const devoluciones = parseFloat(document.getElementById('adminDevoluciones').textContent.replace('RD$ ', '')) || 0;
    const transferenciasTotal = parseFloat(document.getElementById('adminTransferencias').textContent.replace('RD$ ', '')) || 0;
    const gastosTotal = parseFloat(document.getElementById('adminGastos').textContent.replace('RD$ ', '')) || 0;
    
    const ventaComision = parseFloat(document.getElementById('adminVentaComision').value) || 0;
    const ventaCentral = parseFloat(document.getElementById('adminVentaCentral').value) || 0;
    const recargasExternas = parseFloat(document.getElementById('adminRecargasExternas').value) || 0;
    
    const fondoFinal = parseFloat(document.getElementById('adminFondoFinal').textContent.replace('RD$ ', '')) || 0;
    
    const cuadre = {
        banca,
        fecha: hasta,
        fondoInicial,
        ventaComision,
        ventaCentral,
        recargasExternas,
        prestamosKiko,
        prestamosCentral,
        devoluciones,
        transferencias: transferenciasTotal,
        gastos: gastosTotal,
        fondoFinal,
        comision: ventaComision,
        central: ventaCentral,
        fechaRegistro: new Date().toISOString()
    };
    
    await db.ref('cuadres_admin').push(cuadre);
    
    bancas[banca].fondo = fondoFinal;
    bancas[banca].ultimoCuadreAdmin = hasta;
    await db.ref(`fondos_bancas/${banca}`).set(bancas[banca]);
    
    alert('✅ Cuadre general guardado');
    cerrarModal('modalCuadreAdmin');
};

window.enviarCuadreAEmpleadas = function() {
    alert('📢 Cuadre enviado a todas las empleadas de la banca');
};

// ========== TRANSFERENCIAS (CORREGIDO) ==========
window.abrirModalTransferencia = function() {
    document.getElementById('transferenciaOrigen').value = '';
    document.getElementById('transferenciaDestino').value = '';
    document.getElementById('transferenciaReferencia').value = '';
    document.getElementById('transferenciaMonto').value = '';
    document.getElementById('transferenciaFecha').value = new Date().toISOString().split('T')[0];
    document.getElementById('transferenciaConcepto').value = '';
    abrirModal('modalTransferencia');
};

window.guardarTransferencia = async function() {
    const origen = document.getElementById('transferenciaOrigen').value;
    const destino = document.getElementById('transferenciaDestino').value;
    const referencia = document.getElementById('transferenciaReferencia').value;
    const monto = parseFloat(document.getElementById('transferenciaMonto').value);
    const fecha = document.getElementById('transferenciaFecha').value;
    const concepto = document.getElementById('transferenciaConcepto').value;

    if (!origen || !destino || !referencia || !monto) {
        return alert('Complete todos los campos obligatorios');
    }

    const transferencia = {
        tipo: 'transferencia',
        banca: usuarioActual.banca,
        bancoOrigen: origen,
        bancoDestino: destino,
        referencia,
        monto,
        fecha,
        concepto,
        estado: 'pendiente', // Pendiente de aprobación
        registradoPor: usuarioActual.nombre,
        empleadaId: usuarioActual.id,
        fechaRegistro: new Date().toISOString()
    };

    await db.ref('transferencias').push(transferencia);
    
    alert('✅ Transferencia registrada (pendiente de aprobación)');
    cerrarModal('modalTransferencia');
};

window.verHistorialTransferencias = function() {
    document.getElementById('pageTitle').textContent = 'Historial de Transferencias';
    
    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
    const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).toISOString().split('T')[0];
    
    let html = `
        <div class="filtros-card">
            <div class="filtros-row">
                <div><label>Desde</label><input type="date" id="filtroTransferenciaDesde" class="form-control" value="${inicioMes}"></div>
                <div><label>Hasta</label><input type="date" id="filtroTransferenciaHasta" class="form-control" value="${finMes}"></div>
                <div><label>Banca</label>
                    <select id="filtroTransferenciaBanca" class="form-control">
                        <option value="todas">Todas</option>
                        <option value="kiko1">Banca Kiko 1</option>
                        <option value="kiko2">Banca Kiko 2</option>
                        <option value="kiko3">Banca Kiko 3</option>
                    </select>
                </div>
                <div><label>Estado</label>
                    <select id="filtroTransferenciaEstado" class="form-control">
                        <option value="todos">Todos</option>
                        <option value="pendiente">Pendiente</option>
                        <option value="aprobado">Aprobado</option>
                    </select>
                </div>
                <div><button class="btn btn-primary" onclick="filtrarTransferencias()">🔍 Filtrar</button></div>
                ${usuarioActual.rol === 'admin' ? `
                <div><button class="btn btn-success" onclick="aprobarTransferenciasMasivas()">✅ Aprobar Pendientes</button></div>
                ` : ''}
            </div>
        </div>
        <div id="transferenciasList"></div>
    `;

    document.getElementById('contentArea').innerHTML = html;
    filtrarTransferencias();
};

window.filtrarTransferencias = function() {
    const desde = document.getElementById('filtroTransferenciaDesde').value;
    const hasta = document.getElementById('filtroTransferenciaHasta').value;
    const banca = document.getElementById('filtroTransferenciaBanca').value;
    const estado = document.getElementById('filtroTransferenciaEstado').value;
    
    let filtradas = transferencias.filter(t => t.fecha >= desde && t.fecha <= hasta);
    
    if (banca !== 'todas') {
        filtradas = filtradas.filter(t => t.banca === banca);
    }
    if (estado !== 'todos') {
        filtradas = filtradas.filter(t => t.estado === estado);
    }
    
    filtradas.sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
    
    const total = filtradas.reduce((s,t) => s + (t.monto || 0), 0);
    const pendientes = filtradas.filter(t => t.estado === 'pendiente').length;
    
    let html = `
        <div class="stats-grid">
            <div class="stat-card info"><div><h3>Total</h3><span class="number">RD$ ${total.toFixed(2)}</span></div></div>
            <div class="stat-card warning"><div><h3>Pendientes</h3><span class="number">${pendientes}</span></div></div>
        </div>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Hora</th>
                        <th>Banca</th>
                        <th>Banco Origen</th>
                        <th>Banco Destino</th>
                        <th>Referencia</th>
                        <th>Monto</th>
                        <th>Concepto</th>
                        <th>Registrado por</th>
                        <th>Estado</th>
                        ${usuarioActual.rol === 'admin' ? '<th>Acciones</th>' : ''}
                    </tr>
                </thead>
                <tbody>
    `;
    
    filtradas.forEach(t => {
        const hora = t.fechaRegistro ? new Date(t.fechaRegistro).toLocaleTimeString() : '';
        const estadoClass = t.estado === 'aprobado' ? 'success' : 'warning';
        
        html += `<tr>
            <td>${t.fecha}</td>
            <td>${hora}</td>
            <td>${bancas[t.banca]?.nombre || t.banca}</td>
            <td>${t.bancoOrigen}</td>
            <td>${t.bancoDestino}</td>
            <td><code>${t.referencia}</code></td>
            <td class="text-danger">RD$ ${t.monto.toFixed(2)}</td>
            <td>${t.concepto || ''}</td>
            <td>${t.registradoPor || ''}</td>
            <td><span class="badge ${estadoClass}">${t.estado || 'pendiente'}</span></td>
            ${usuarioActual.rol === 'admin' ? `
            <td>
                ${t.estado !== 'aprobado' ? `
                <button class="btn btn-success btn-sm" onclick="aprobarTransferencia('${t.id}')">✅ Aprobar</button>
                ` : ''}
            </td>
            ` : ''}
        </tr>`;
    });
    
    if (filtradas.length === 0) {
        html += `<tr><td colspan="${usuarioActual.rol === 'admin' ? 11 : 10}" style="text-align:center;">No hay transferencias</td></tr>`;
    }
    
    html += `</tbody></table></div>`;
    
    document.getElementById('transferenciasList').innerHTML = html;
};

window.aprobarTransferencia = async function(id) {
    if (!confirm('¿Aprobar esta transferencia?')) return;
    
    await db.ref(`transferencias/${id}`).update({
        estado: 'aprobado',
        fechaAprobacion: new Date().toISOString(),
        aprobadoPor: usuarioActual.nombre
    });
    
    filtrarTransferencias();
};

window.aprobarTransferenciasMasivas = function() {
    if (!confirm('¿Aprobar todas las transferencias pendientes?')) return;
    
    const pendientes = transferencias.filter(t => t.estado === 'pendiente');
    
    pendientes.forEach(async t => {
        await db.ref(`transferencias/${t.id}`).update({
            estado: 'aprobado',
            fechaAprobacion: new Date().toISOString(),
            aprobadoPor: usuarioActual.nombre
        });
    });
    
    alert(`✅ ${pendientes.length} transferencias aprobadas`);
    filtrarTransferencias();
};

// ========== PANEL EMPLEADA (CORREGIDO) ==========
window.cargarPanelEmpleada = function() {
    document.getElementById('pageTitle').textContent = `Mi Panel - ${usuarioActual.nombre}`;

    const misClientes = clientes.filter(c => c.banca === usuarioActual.banca);
    const deudaTotal = misClientes.reduce((s,c) => s + (c.deuda || 0), 0);
    const fondoTotal = misClientes.reduce((s,c) => s + (c.fondo || 0), 0);
    
    const fondoBanca = bancas[usuarioActual.banca]?.fondo || 0;
    const fondoDisponibleBanca = calcularFondoDisponibleBanca(usuarioActual.banca);
    
    const ticketsPendientes = ticketsSolicitados.filter(t => t.empleadaId === usuarioActual.id && t.estado === 'pendiente').length;
    
    const misFaltantes = faltantes.filter(f => f.empleadaId === usuarioActual.id && !f.descontado);
    const totalFaltantes = misFaltantes.reduce((s,f) => s + f.monto, 0);
    
    const misPrestamos = prestamos.filter(p => p.tipo === 'empleada' && p.personaId === usuarioActual.id && !p.pagado);
    const totalPrestamos = misPrestamos.reduce((s,p) => {
        const cuotasRestantes = p.cuotas - (p.cuotasPagadas || 0);
        return s + (p.montoPorCuota * cuotasRestantes);
    }, 0);
    
    const clientesMorosos = misClientes.filter(c => esClienteMoroso(c)).length;
    
    const transferenciasHoy = transferencias.filter(t => 
        t.banca === usuarioActual.banca && 
        t.fecha === new Date().toISOString().split('T')[0]
    );
    const totalTransferenciasHoy = transferenciasHoy.reduce((s,t) => s + t.monto, 0);

    document.getElementById('contentArea').innerHTML = `
        <div class="stats-grid">
            <div class="stat-card primary">
                <div class="stat-info">
                    <h3>Mis Clientes</h3>
                    <span class="number">${misClientes.length}</span>
                </div>
                <i class="fas fa-users stat-icon"></i>
            </div>
            <div class="stat-card danger">
                <div class="stat-info">
                    <h3>Deuda Total</h3>
                    <span class="number">RD$ ${deudaTotal.toFixed(2)}</span>
                </div>
                <i class="fas fa-dollar-sign stat-icon"></i>
            </div>
            <div class="stat-card success">
                <div class="stat-info">
                    <h3>Fondo Total</h3>
                    <span class="number">RD$ ${fondoTotal.toFixed(2)}</span>
                </div>
                <i class="fas fa-hand-holding-heart stat-icon"></i>
            </div>
            <div class="stat-card ${fondoDisponibleBanca < 0 ? 'danger' : 'info'}">
                <div class="stat-info">
                    <h3>Fondo Banca Disp.</h3>
                    <span class="number ${fondoDisponibleBanca < 0 ? 'text-danger' : 'text-success'}">RD$ ${Math.abs(fondoDisponibleBanca).toFixed(2)}</span>
                    <br><small>${fondoDisponibleBanca < 0 ? '🔴 RIESGO' : '🟢 DISPONIBLE'}</small>
                </div>
                <i class="fas fa-piggy-bank stat-icon"></i>
            </div>
            <div class="stat-card info">
                <div class="stat-info">
                    <h3>Fondo Bruto</h3>
                    <span class="number">RD$ ${fondoBanca.toFixed(2)}</span>
                </div>
                <i class="fas fa-building stat-icon"></i>
            </div>
            <div class="stat-card warning">
                <div class="stat-info">
                    <h3>Solicitudes</h3>
                    <span class="number">${ticketsPendientes}</span>
                </div>
                <i class="fas fa-clock stat-icon"></i>
            </div>
            <div class="stat-card danger">
                <div class="stat-info">
                    <h3>Clientes Morosos</h3>
                    <span class="number">${clientesMorosos}</span>
                </div>
                <i class="fas fa-exclamation-triangle stat-icon"></i>
            </div>
            <div class="stat-card purple">
                <div class="stat-info">
                    <h3>Transferencias Hoy</h3>
                    <span class="number">${transferenciasHoy.length}</span>
                    <br><small>RD$ ${totalTransferenciasHoy.toFixed(2)}</small>
                </div>
                <i class="fas fa-money-bill-transfer stat-icon"></i>
            </div>
            ${totalFaltantes > 0 ? `
            <div class="stat-card danger">
                <div class="stat-info">
                    <h3>Faltantes</h3>
                    <span class="number">RD$ ${totalFaltantes.toFixed(2)}</span>
                </div>
                <i class="fas fa-exclamation-triangle stat-icon"></i>
            </div>
            ` : ''}
            ${totalPrestamos > 0 ? `
            <div class="stat-card purple">
                <div class="stat-info">
                    <h3>Préstamos</h3>
                    <span class="number">RD$ ${totalPrestamos.toFixed(2)}</span>
                </div>
                <i class="fas fa-hand-holding-dollar stat-icon"></i>
            </div>
            ` : ''}
        </div>
        <div class="acciones-rapidas">
            <button class="btn btn-primary" onclick="cargarMisClientes()"><i class="fa-solid fa-users"></i> Ver Clientes</button>
            <button class="btn btn-info" onclick="abrirVerificarTicket()"><i class="fa-solid fa-magnifying-glass"></i> Verificar Ticket</button>
            <button class="btn btn-warning" onclick="abrirModalDeuda()"><i class="fa-solid fa-dollar-sign"></i> Registrar Deuda/Pago</button>
            <button class="btn btn-success" onclick="abrirModalPremio()"><i class="fa-solid fa-trophy"></i> Registrar Premio</button>
            <button class="btn btn-secondary" onclick="abrirModalTransferencia()"><i class="fa-solid fa-money-bill-transfer"></i> Registrar Transferencia</button>
        </div>
        
        ${transferenciasHoy.length > 0 ? `
        <h3 style="margin-top:30px;">📋 Transferencias de Hoy</h3>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Hora</th>
                        <th>Banco Origen</th>
                        <th>Banco Destino</th>
                        <th>Referencia</th>
                        <th>Monto</th>
                        <th>Concepto</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
                    ${transferenciasHoy.map(t => `
                        <tr>
                            <td>${new Date(t.fechaRegistro).toLocaleTimeString()}</td>
                            <td>${t.bancoOrigen}</td>
                            <td>${t.bancoDestino}</td>
                            <td><code>${t.referencia}</code></td>
                            <td class="text-danger">RD$ ${t.monto.toFixed(2)}</td>
                            <td>${t.concepto || ''}</td>
                            <td><span class="badge ${t.estado === 'aprobado' ? 'success' : 'warning'}">${t.estado || 'pendiente'}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ` : ''}
    `;
};

// ========== PANEL ADMIN (CORREGIDO) ==========
window.cargarPanelAdmin = function() {
    document.getElementById('pageTitle').textContent = 'Dashboard Admin';

    const totalEmpleadas = empleadas.length;
    const totalClientes = clientes.length;
    const totalDeudaClientes = clientes.reduce((s,c) => s + (c.deuda || 0), 0);
    const totalFondoClientes = clientes.reduce((s,c) => s + (c.fondo || 0), 0);
    const solicitudesPendientes = ticketsSolicitados.filter(t => t.estado === 'pendiente').length;
    
    const hoy = new Date().toISOString().split('T')[0];
    const gastosHoy = gastos.filter(g => g.fecha === hoy).reduce((s,g) => s + g.monto, 0);
    const prestamosPendientes = prestamos.filter(p => !p.pagado).length;
    const faltantesPendientes = faltantes.filter(f => !f.descontado).length;
    const clientesMorosos = clientes.filter(c => esClienteMoroso(c)).length;
    
    const transferenciasHoy = transferencias.filter(t => t.fecha === hoy);
    const totalTransferenciasHoy = transferenciasHoy.reduce((s,t) => s + t.monto, 0);
    const transferenciasPendientes = transferencias.filter(t => t.estado === 'pendiente').length;
    
    // Calcular fondo disponible por banca
    let fondosDisponiblesHtml = '';
    for (let [key, banca] of Object.entries(bancas)) {
        const fondoDisponible = calcularFondoDisponibleBanca(key);
        htmlFondoClass = fondoDisponible < 0 ? 'danger' : 'success';
        
        fondosDisponiblesHtml += `
            <div class="stat-card ${fondoDisponible < 0 ? 'danger' : 'info'}">
                <div class="stat-info">
                    <h3>${banca.nombre}</h3>
                    <span class="number ${fondoDisponible < 0 ? 'text-danger' : 'text-success'}">RD$ ${Math.abs(fondoDisponible).toFixed(2)}</span>
                    <br><small>Bruto: RD$ ${(banca.fondo || 0).toFixed(2)}</small>
                </div>
                <i class="fas fa-building stat-icon"></i>
            </div>
        `;
    }

    document.getElementById('contentArea').innerHTML = `
        <div class="stats-grid">
            <div class="stat-card primary">
                <div class="stat-info">
                    <h3>Empleadas</h3>
                    <span class="number">${totalEmpleadas}</span>
                </div>
                <i class="fas fa-users stat-icon"></i>
            </div>
            <div class="stat-card success">
                <div class="stat-info">
                    <h3>Clientes</h3>
                    <span class="number">${totalClientes}</span>
                </div>
                <i class="fas fa-user-group stat-icon"></i>
            </div>
            <div class="stat-card danger">
                <div class="stat-info">
                    <h3>Deuda Total</h3>
                    <span class="number">RD$ ${totalDeudaClientes.toFixed(2)}</span>
                </div>
                <i class="fas fa-dollar-sign stat-icon"></i>
            </div>
            <div class="stat-card success">
                <div class="stat-info">
                    <h3>Fondo Total</h3>
                    <span class="number">RD$ ${totalFondoClientes.toFixed(2)}</span>
                </div>
                <i class="fas fa-hand-holding-heart stat-icon"></i>
            </div>
            <div class="stat-card warning">
                <div class="stat-info">
                    <h3>Solicitudes</h3>
                    <span class="number">${solicitudesPendientes}</span>
                </div>
                <i class="fas fa-clock stat-icon"></i>
            </div>
            <div class="stat-card danger">
                <div class="stat-info">
                    <h3>Gastos Hoy</h3>
                    <span class="number">RD$ ${gastosHoy.toFixed(2)}</span>
                </div>
                <i class="fas fa-receipt stat-icon"></i>
            </div>
            <div class="stat-card info">
                <div class="stat-info">
                    <h3>Préstamos Pend.</h3>
                    <span class="number">${prestamosPendientes}</span>
                </div>
                <i class="fas fa-hand-holding-dollar stat-icon"></i>
            </div>
            <div class="stat-card warning">
                <div class="stat-info">
                    <h3>Faltantes Pend.</h3>
                    <span class="number">${faltantesPendientes}</span>
                </div>
                <i class="fas fa-exclamation-triangle stat-icon"></i>
            </div>
            <div class="stat-card danger">
                <div class="stat-info">
                    <h3>Clientes Morosos</h3>
                    <span class="number">${clientesMorosos}</span>
                </div>
                <i class="fas fa-exclamation-circle stat-icon"></i>
            </div>
            <div class="stat-card purple">
                <div class="stat-info">
                    <h3>Transferencias Hoy</h3>
                    <span class="number">${transferenciasHoy.length}</span>
                    <br><small>RD$ ${totalTransferenciasHoy.toFixed(2)}</small>
                </div>
                <i class="fas fa-money-bill-transfer stat-icon"></i>
            </div>
            <div class="stat-card warning">
                <div class="stat-info">
                    <h3>Transf. Pendientes</h3>
                    <span class="number">${transferenciasPendientes}</span>
                </div>
                <i class="fas fa-clock stat-icon"></i>
            </div>
            ${fondosDisponiblesHtml}
        </div>
        <div class="acciones-rapidas">
            <button class="btn btn-primary" onclick="cargarEmpleadas()"><i class="fa-solid fa-users"></i> Empleadas</button>
            <button class="btn btn-success" onclick="cargarClientes()"><i class="fa-solid fa-user-group"></i> Clientes</button>
            <button class="btn btn-warning" onclick="cargarSolicitudesTickets()"><i class="fa-solid fa-clock"></i> Solicitudes</button>
            <button class="btn btn-info" onclick="cargarGastosAdmin()"><i class="fa-solid fa-receipt"></i> Gastos</button>
            <button class="btn btn-purple" onclick="cargarPrestamosAdmin()"><i class="fa-solid fa-hand-holding-dollar"></i> Préstamos</button>
            <button class="btn btn-secondary" onclick="cargarCuadresBancaAdmin()"><i class="fa-solid fa-building"></i> Ver Cuadres</button>
            <button class="btn btn-info" onclick="verHistorialTransferencias()"><i class="fa-solid fa-clock-rotate-left"></i> Historial Transferencias</button>
            <button class="btn btn-warning" onclick="verFondosBancas()"><i class="fa-solid fa-piggy-bank"></i> Ver Fondos</button>
            <button class="btn btn-danger" onclick="abrirModalCuadreAdmin()"><i class="fa-solid fa-file-invoice"></i> Realizar Cuadre</button>
        </div>
        
        ${transferenciasHoy.length > 0 ? `
        <h3 style="margin-top:30px;">📋 Transferencias de Hoy</h3>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Hora</th>
                        <th>Banca</th>
                        <th>Banco Origen</th>
                        <th>Banco Destino</th>
                        <th>Referencia</th>
                        <th>Monto</th>
                        <th>Concepto</th>
                        <th>Registrado por</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
                    ${transferenciasHoy.map(t => `
                        <tr>
                            <td>${new Date(t.fechaRegistro).toLocaleTimeString()}</td>
                            <td>${bancas[t.banca]?.nombre}</td>
                            <td>${t.bancoOrigen}</td>
                            <td>${t.bancoDestino}</td>
                            <td><code>${t.referencia}</code></td>
                            <td class="text-danger">RD$ ${t.monto.toFixed(2)}</td>
                            <td>${t.concepto || ''}</td>
                            <td>${t.registradoPor || ''}</td>
                            <td><span class="badge ${t.estado === 'aprobado' ? 'success' : 'warning'}">${t.estado || 'pendiente'}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ` : ''}
    `;
};

// ========== PANEL CLIENTE ==========
window.cargarPanelCliente = function() {
    document.getElementById('pageTitle').textContent = `Mi Estado - ${usuarioActual.nombre}`;

    const cliente = clientes.find(c => c.id === usuarioActual.id);
    if (!cliente) return;

    const misPremios = premios.filter(p => p.clienteId === cliente.id);
    const misDeudas = deudas.filter(d => d.clienteId === cliente.id).slice(0, 5);

    const fondoNeto = getFondoCliente(cliente);
    const estadoTexto = fondoNeto < 0 ? 'DEBE' : fondoNeto > 0 ? 'A FAVOR' : 'AL DÍA';
    const estadoClass = fondoNeto < 0 ? 'danger' : fondoNeto > 0 ? 'success' : 'info';

    let fechaActualizacion = 'Nunca';
    if (cliente.fechaActualizacion) {
        const fecha = new Date(cliente.fechaActualizacion);
        fechaActualizacion = fecha.toLocaleString('es-DO', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    document.getElementById('contentArea').innerHTML = `
        ${cliente.mensajeAdmin ? `
        <div class="mensaje-emergente">
            <i class="fa-solid fa-circle-info"></i>
            <strong>📢 Mensaje:</strong> ${cliente.mensajeAdmin}
        </div>
        ` : ''}
        ${fondoNeto > 0 ? `
        <div class="mensaje-emergente" style="background: #27ae60; color: white;">
            <i class="fa-solid fa-circle-info"></i>
            <strong>💰 Tienes RD$ ${fondoNeto.toFixed(2)} a tu favor</strong> - Puedes usarlo para pagar o retirarlo
        </div>
        ` : fondoNeto < 0 ? `
        <div class="mensaje-emergente" style="background: #e74c3c; color: white;">
            <i class="fa-solid fa-circle-exclamation"></i>
            <strong>⚠️ Debes RD$ ${Math.abs(fondoNeto).toFixed(2)}</strong> - Por favor ponte al día
        </div>
        ` : ''}
        
        <div class="stats-grid">
            <div class="stat-card primary">
                <div class="stat-info">
                    <h3>Mi Deuda</h3>
                    <span class="number ${cliente.deuda > 0 ? 'text-danger' : 'text-success'}">RD$ ${(cliente.deuda || 0).toFixed(2)}</span>
                </div>
            </div>
            <div class="stat-card success">
                <div class="stat-info">
                    <h3>Mi Fondo</h3>
                    <span class="number">RD$ ${(cliente.fondo || 0).toFixed(2)}</span>
                </div>
            </div>
            <div class="stat-card ${estadoClass}">
                <div class="stat-info">
                    <h3>Mi Estado</h3>
                    <span class="number ${fondoNeto < 0 ? 'text-danger' : 'text-success'}">${estadoTexto}</span>
                    <br><small>RD$ ${Math.abs(fondoNeto).toFixed(2)}</small>
                </div>
            </div>
        </div>

        <p><strong>Última actualización:</strong> ${fechaActualizacion}</p>

        <h3>📋 Últimos Movimientos</h3>
        <div class="table-container">
            <table>
                <thead><tr><th>Fecha</th><th>Hora</th><th>Tipo</th><th>Forma Pago</th><th>Monto</th><th>Concepto</th></tr></thead>
                <tbody>
                    ${misDeudas.map(d => `
                        <tr>
                            <td>${d.fecha}</td>
                            <td>${d.hora || ''}</td>
                            <td>${d.tipo === 'deuda' ? '➕ Deuda' : '➖ Pago'}</td>
                            <td>${getFormaPagoIcon(d.formaPago)}</td>
                            <td class="${d.tipo === 'deuda' ? 'text-danger' : 'text-success'}">RD$ ${Math.abs(d.monto).toFixed(2)}</td>
                            <td>${d.concepto || ''}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <h3>🏆 Mis Premios</h3>
        <div class="table-container">
            <table>
                <thead><tr><th>Fecha</th><th>Loterías</th><th>Monto</th></tr></thead>
                <tbody>
                    ${misPremios.slice(0,5).map(p => `
                        <tr>
                            <td>${p.fecha}</td>
                            <td>${Array.isArray(p.loterias) ? p.loterias.join(', ') : p.loteria || ''}</td>
                            <td class="text-success">RD$ ${p.monto.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
};

window.cargarMisPremios = function() {
    document.getElementById('pageTitle').textContent = 'Mis Premios';

    const misPremios = premios.filter(p => p.clienteId === usuarioActual.id).sort((a,b) => new Date(b.fecha) - new Date(a.fecha));

    document.getElementById('contentArea').innerHTML = `
        <div class="table-container">
            <table>
                <thead><tr><th>Fecha</th><th>Loterías</th><th>Monto</th></tr></thead>
                <tbody>
                    ${misPremios.map(p => `
                        <tr>
                            <td>${p.fecha}</td>
                            <td>${Array.isArray(p.loterias) ? p.loterias.join(', ') : p.loteria || ''}</td>
                            <td class="text-success">RD$ ${p.monto.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    if (misPremios.length === 0) {
        document.getElementById('contentArea').innerHTML += '<p style="text-align:center;">No has recibido premios aún</p>';
    }
};

window.cargarMisDeudas = function() {
    document.getElementById('pageTitle').textContent = 'Mis Deudas y Pagos';

    const misDeudas = deudas.filter(d => d.clienteId === usuarioActual.id).sort((a,b) => new Date(b.fecha) - new Date(a.fecha));

    document.getElementById('contentArea').innerHTML = `
        <div class="table-container">
            <table>
                <thead><tr><th>Fecha</th><th>Hora</th><th>Tipo</th><th>Forma Pago</th><th>Monto</th><th>Concepto</th><th>Deuda Ant.</th><th>Deuda Nueva</th><th>Fondo Ant.</th><th>Fondo Nuevo</th></tr></thead>
                <tbody>
                    ${misDeudas.map(d => `
                        <tr>
                            <td>${d.fecha}</td>
                            <td>${d.hora || ''}</td>
                            <td>${d.tipo === 'deuda' ? '➕ Deuda' : '➖ Pago'}</td>
                            <td>${getFormaPagoIcon(d.formaPago)}</td>
                            <td class="${d.tipo === 'deuda' ? 'text-danger' : 'text-success'}">RD$ ${Math.abs(d.monto).toFixed(2)}</td>
                            <td>${d.concepto || ''}</td>
                            <td>RD$ ${(d.deudaAnterior || 0).toFixed(2)}</td>
                            <td>RD$ ${(d.deudaNueva || 0).toFixed(2)}</td>
                            <td>RD$ ${(d.fondoAnterior || 0).toFixed(2)}</td>
                            <td>RD$ ${(d.fondoNuevo || 0).toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    if (misDeudas.length === 0) {
        document.getElementById('contentArea').innerHTML += '<p style="text-align:center;">No hay movimientos</p>';
    }
};

// ========== MIS CLIENTES (EMPLEADA) ==========
window.cargarMisClientes = function() {
    document.getElementById('pageTitle').textContent = 'Mis Clientes';

    const misClientes = clientes.filter(c => c.banca === usuarioActual.banca);

    let html = `
        <div class="acciones-rapidas">
            <button class="btn btn-primary" onclick="cargarMisClientes()"><i class="fa-solid fa-rotate"></i> Actualizar</button>
        </div>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>WhatsApp</th>
                        <th>Deuda</th>
                        <th>Fondo</th>
                        <th>Estado</th>
                        <th>Última Actualización</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
    `;

    misClientes.forEach(c => {
        const fondoNeto = getFondoCliente(c);
        const estadoTexto = fondoNeto < 0 ? '🔴 DEBE' : fondoNeto > 0 ? '🟢 A FAVOR' : '⚪ AL DÍA';
        const estadoClass = fondoNeto < 0 ? 'danger' : fondoNeto > 0 ? 'success' : 'info';
        const mensajeAdmin = c.mensajeAdmin || '';
        
        let fechaActualizacion = 'Nunca';
        if (c.fechaActualizacion) {
            const fecha = new Date(c.fechaActualizacion);
            fechaActualizacion = fecha.toLocaleString('es-DO', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        
        html += `<tr>
            <td>${c.nombre} ${mensajeAdmin ? '<i class="fa-solid fa-bell" style="color: #f39c12;" title="' + mensajeAdmin + '"></i>' : ''}</td>
            <td><a href="https://wa.me/${c.whatsapp}" class="whatsapp-btn" target="_blank">📱 ${c.whatsapp}</a></td>
            <td class="${c.deuda > 0 ? 'text-danger' : 'text-success'}">RD$ ${(c.deuda || 0).toFixed(2)}</td>
            <td class="${c.fondo > 0 ? 'text-success' : ''}">RD$ ${(c.fondo || 0).toFixed(2)}</td>
            <td><span class="badge ${estadoClass}">${estadoTexto}</span></td>
            <td>${fechaActualizacion}</td>
            <td>
                <button class="btn btn-success btn-sm" onclick="abrirPagoCliente('${c.id}')" title="Registrar Pago">💰 Pagar</button>
                ${(c.fondo || 0) > 0 ? `
                <button class="btn btn-warning btn-sm" onclick="abrirRetiroCliente('${c.id}')" title="Retirar Fondo">💸 Retirar</button>
                ` : ''}
                <button class="btn btn-warning btn-sm" onclick="abrirModalRecordatorio('${c.id}')" title="Enviar Recordatorio">📱 Recordar</button>
            </td>
        </tr>`;
    });

    if (misClientes.length === 0) {
        html += `<tr><td colspan="7" style="text-align:center;">No hay clientes</td></tr>`;
    }

    html += `</tbody></table></div>`;
    document.getElementById('contentArea').innerHTML = html;
};

// ========== RECORDATORIOS ==========
window.cargarRecordatorios = function() {
    document.getElementById('pageTitle').textContent = 'Recordatorios WhatsApp';

    const misClientes = clientes.filter(c => c.banca === usuarioActual.banca);

    let options = '<option value="">Seleccionar cliente</option>';
    misClientes.forEach(c => {
        const fondoNeto = getFondoCliente(c);
        options += `<option value="${c.id}" data-whatsapp="${c.whatsapp}" data-deuda="${c.deuda || 0}" data-fondo="${c.fondo || 0}">${c.nombre} (Deuda: RD$ ${(c.deuda || 0).toFixed(2)} | Fondo: RD$ ${(c.fondo || 0).toFixed(2)} | Neto: RD$ ${fondoNeto.toFixed(2)})</option>`;
    });
    document.getElementById('recordatorioCliente').innerHTML = options;

    let html = `
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Cliente</th><th>WhatsApp</th><th>Deuda</th><th>Fondo</th><th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
    `;

// ========== RECORDATORIOS (CORREGIDO) ==========
window.cargarRecordatorios = function() {
    document.getElementById('pageTitle').textContent = 'Recordatorios WhatsApp';

    const misClientes = clientes.filter(c => c.banca === usuarioActual.banca);

    let options = '<option value="">Seleccionar cliente</option>';
    misClientes.forEach(c => {
        const fondoNeto = getFondoCliente(c);
        options += `<option value="${c.id}" data-whatsapp="${c.whatsapp}" data-deuda="${c.deuda || 0}" data-fondo="${c.fondo || 0}">${c.nombre} (Deuda: RD$ ${(c.deuda || 0).toFixed(2)} | Fondo: RD$ ${(c.fondo || 0).toFixed(2)} | Neto: RD$ ${fondoNeto.toFixed(2)})</option>`;
    });
    document.getElementById('recordatorioCliente').innerHTML = options;

    let html = `
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Cliente</th>
                        <th>WhatsApp</th>
                        <th>Deuda</th>
                        <th>Fondo</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
    `;

    misClientes.forEach(c => {
        const fondoNeto = getFondoCliente(c);
        
        html += `<tr>
            <td>${c.nombre}</td>
            <td><a href="https://wa.me/${c.whatsapp}" class="whatsapp-btn" target="_blank">📱 ${c.whatsapp}</a></td>
            <td class="${c.deuda > 0 ? 'text-danger' : 'text-success'}">RD$ ${(c.deuda || 0).toFixed(2)}</td>
            <td class="${c.fondo > 0 ? 'text-success' : ''}">RD$ ${(c.fondo || 0).toFixed(2)}</td>
            <td>
                <button class="btn btn-success btn-sm" onclick="abrirModalRecordatorio('${c.id}')">📱 Enviar</button>
            </td>
        </tr>`;
    });

    if (misClientes.length === 0) {
        html += `<tr><td colspan="5" style="text-align:center;">No hay clientes</td></tr>`;
    }

    html += `</tbody></table></div>`;
    document.getElementById('contentArea').innerHTML = html;
};

    if (misClientes.length === 0) {
        html += `<tr><td colspan="5" style="text-align:center;">No hay clientes</td></tr>`;
    }

    html += `</tbody></table></div>`;
    document.getElementById('contentArea').innerHTML = html;
};

window.abrirModalRecordatorio = function(clienteId) {
    const cliente = clientes.find(c => c.id === clienteId);
    if (!cliente) return;

    const fondoNeto = getFondoCliente(cliente);
    document.getElementById('recordatorioCliente').innerHTML = `<option value="${cliente.id}" data-whatsapp="${cliente.whatsapp}" data-deuda="${cliente.deuda || 0}" data-fondo="${cliente.fondo || 0}">${cliente.nombre}</option>`;
    document.getElementById('recordatorioTipo').value = 'pago';
    actualizarMensajeRecordatorio();
    abrirModal('modalRecordatorio');
};

window.actualizarMensajeRecordatorio = function() {
    const tipo = document.getElementById('recordatorioTipo').value;
    const select = document.getElementById('recordatorioCliente');
    const option = select.options[select.selectedIndex];
    
    if (!option.value) return;

    const nombre = option.text.split(' (')[0];
    const deuda = parseFloat(option.dataset.deuda) || 0;
    const fondo = parseFloat(option.dataset.fondo) || 0;
    const fondoNeto = fondo - deuda;

    let mensaje = '';
    if (tipo === 'pago') {
        mensaje = `*BANCAS KIKO*\n*RECORDATORIO DE PAGO*\n\nEstimado/a ${nombre}, le recordamos que tiene una deuda de *RD$ ${deuda.toFixed(2)}*.\n\nPor favor acerque a realizar su pago.\n¡Gracias! 🙏`;
    } else if (tipo === 'cobrar') {
        mensaje = `*BANCAS KIKO*\n*FONDO DISPONIBLE*\n\nEstimado/a ${nombre}, tiene *RD$ ${fondo.toFixed(2)}* a su favor.\n\nPuede pasar a retirarlo o usarlo para pagar.\n¡Feliz día! 💰`;
    } else {
        mensaje = `*BANCAS KIKO*\n*LIQUIDACIÓN DE CUENTA*\n\nEstimado/a ${nombre}, su cuenta ha sido liquidada.\n\nDeuda anterior: RD$ ${deuda.toFixed(2)}\nNuevo saldo: RD$ 0\n\n¡Gracias por su pago! ✅`;
    }

    document.getElementById('recordatorioMensaje').value = mensaje;
};

window.enviarRecordatorio = function() {
    const select = document.getElementById('recordatorioCliente');
    const option = select.options[select.selectedIndex];
    const whatsapp = option.dataset.whatsapp;
    const mensaje = document.getElementById('recordatorioMensaje').value;

    if (!whatsapp) return alert('Cliente sin WhatsApp');
    
    window.open(`https://wa.me/${whatsapp}?text=${encodeURIComponent(mensaje)}`, '_blank');
    cerrarModal('modalRecordatorio');
};

// ========== TICKETS ==========
window.abrirVerificarTicket = function() {
    document.getElementById('verificarNumeroTicket').value = '';
    document.getElementById('resultadoVerificacion').style.display = 'none';
    document.getElementById('btnSolicitarPago').disabled = true;
    abrirModal('modalVerificarTicket');
};

window.buscarTicketPorNumero = function() {
    const numero = document.getElementById('verificarNumeroTicket').value;
    if (numero.length < 3) {
        document.getElementById('resultadoVerificacion').style.display = 'none';
        return;
    }

    const ticket = tickets.find(t => t.numero === numero && !t.pagado);
    
    if (ticket) {
        document.getElementById('ticketNumeroEncontrado').textContent = ticket.numero;
        document.getElementById('ticketFechaEncontrado').textContent = ticket.fecha;
        document.getElementById('ticketMontoEncontrado').textContent = `RD$ ${ticket.monto.toFixed(2)}`;
        document.getElementById('ticketEstadoEncontrado').textContent = ticket.estado || 'Disponible';
        document.getElementById('resultadoVerificacion').style.display = 'block';
        document.getElementById('btnSolicitarPago').disabled = false;
        window.ticketEncontrado = ticket;
    } else {
        document.getElementById('resultadoVerificacion').style.display = 'none';
        alert('❌ Ticket no encontrado o ya fue pagado');
    }
};

window.solicitarPagoTicket = async function() {
    const ticket = window.ticketEncontrado;
    if (!ticket) return;

    if (!confirm(`¿Solicitar pago de ticket #${ticket.numero} por RD$ ${ticket.monto.toFixed(2)}?`)) return;

    await db.ref('tickets_solicitados').push({
        ticketId: ticket.id,
        numero: ticket.numero,
        monto: ticket.monto,
        fecha: ticket.fecha,
        empleadaId: usuarioActual.id,
        empleadaNombre: usuarioActual.nombre,
        banca: usuarioActual.banca,
        estado: 'pendiente',
        fechaSolicitud: new Date().toISOString()
    });

    alert('✅ Solicitud enviada al admin para validación');
    cerrarModal('modalVerificarTicket');
};

window.cargarMisSolicitudes = function() {
    document.getElementById('pageTitle').textContent = 'Mis Solicitudes de Pago';

    const misSolicitudes = ticketsSolicitados
        .filter(t => t.empleadaId === usuarioActual.id)
        .sort((a,b) => new Date(b.fechaSolicitud) - new Date(a.fechaSolicitud));

    let html = `
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Número</th>
                        <th>Fecha Ticket</th>
                        <th>Monto</th>
                        <th>Fecha Solicitud</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
    `;

    misSolicitudes.forEach(s => {
        const estadoClass = s.estado === 'aprobado' ? 'success' : s.estado === 'rechazado' ? 'danger' : 'warning';
        html += `<tr>
            <td><code>${s.numero}</code></td>
            <td>${s.fecha}</td>
            <td>RD$ ${s.monto.toFixed(2)}</td>
            <td>${new Date(s.fechaSolicitud).toLocaleString()}</td>
            <td><span class="badge ${estadoClass}">${s.estado}</span></td>
        </tr>`;
    });

    if (misSolicitudes.length === 0) {
        html += `<tr><td colspan="5" style="text-align:center;">No hay solicitudes</td></tr>`;
    }

    html += `</tbody></table></div>`;
    document.getElementById('contentArea').innerHTML = html;
};

window.cargarTicketsAdmin = function() {
    document.getElementById('pageTitle').textContent = 'Cargar Tickets del Sistema';

    let html = `
        <div class="acciones-rapidas">
            <button class="btn btn-primary" onclick="mostrarFormNuevoTicket()">
                <i class="fa-solid fa-plus"></i> Cargar Nuevo Ticket
            </button>
        </div>
        <div id="formNuevoTicket" style="display:none; background:#f8f9fa; padding:20px; border-radius:8px; margin-bottom:20px;">
            <h4>📝 Cargar Ticket Manual</h4>
            <div class="form-row">
                <div class="form-group half">
                    <label>Número de Ticket</label>
                    <input type="text" id="nuevoTicketNumero" class="form-control" placeholder="Ej: 123456">
                </div>
                <div class="form-group half">
                    <label>Monto (RD$)</label>
                    <input type="number" id="nuevoTicketMonto" class="form-control" min="0" step="0.01">
                </div>
            </div>
            <div class="form-group">
                <label>Fecha del Ticket</label>
                <input type="date" id="nuevoTicketFecha" class="form-control">
            </div>
            <button class="btn btn-success" onclick="guardarNuevoTicket()">💾 Guardar Ticket</button>
            <button class="btn btn-secondary" onclick="ocultarFormNuevoTicket()">✖ Cancelar</button>
        </div>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Número</th>
                        <th>Fecha</th>
                        <th>Monto</th>
                        <th>Pagado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
    `;

    tickets.sort((a,b) => new Date(b.fecha) - new Date(a.fecha)).forEach(t => {
        html += `<tr>
            <td><code>${t.numero}</code></td>
            <td>${t.fecha}</td>
            <td>RD$ ${t.monto.toFixed(2)}</td>
            <td><span class="badge ${t.pagado ? 'success' : 'warning'}">${t.pagado ? 'Sí' : 'No'}</span></td>
            <td>
                <button class="btn btn-danger btn-sm" onclick="eliminarTicket('${t.id}')"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>`;
    });

    if (tickets.length === 0) {
        html += `<tr><td colspan="5" style="text-align:center;">No hay tickets cargados</td></tr>`;
    }

    html += `</tbody></table></div>`;
    document.getElementById('contentArea').innerHTML = html;
};

window.mostrarFormNuevoTicket = function() {
    document.getElementById('formNuevoTicket').style.display = 'block';
    document.getElementById('nuevoTicketNumero').value = '';
    document.getElementById('nuevoTicketMonto').value = '';
    document.getElementById('nuevoTicketFecha').value = new Date().toISOString().split('T')[0];
};

window.ocultarFormNuevoTicket = function() {
    document.getElementById('formNuevoTicket').style.display = 'none';
};

window.guardarNuevoTicket = async function() {
    const numero = document.getElementById('nuevoTicketNumero').value;
    const monto = parseFloat(document.getElementById('nuevoTicketMonto').value);
    const fecha = document.getElementById('nuevoTicketFecha').value;

    if (!numero || !monto) {
        return alert('Complete los campos correctamente');
    }

    await db.ref('tickets').push({
        numero,
        monto,
        fecha,
        pagado: false,
        fechaRegistro: new Date().toISOString()
    });

    alert('✅ Ticket cargado');
    ocultarFormNuevoTicket();
    cargarTicketsAdmin();
};

window.eliminarTicket = async function(id) {
    if (!confirm('¿Eliminar ticket?')) return;
    await db.ref(`tickets/${id}`).remove();
    cargarTicketsAdmin();
};

window.cargarSolicitudesTickets = function() {
    document.getElementById('pageTitle').textContent = 'Solicitudes de Pago de Tickets';

    const pendientes = ticketsSolicitados.filter(t => t.estado === 'pendiente');

    let html = `
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Número</th>
                        <th>Fecha Ticket</th>
                        <th>Monto</th>
                        <th>Empleada</th>
                        <th>Banca</th>
                        <th>Fecha Solicitud</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
    `;

    pendientes.sort((a,b) => new Date(b.fechaSolicitud) - new Date(a.fechaSolicitud)).forEach(s => {
        html += `<tr>
            <td><code>${s.numero}</code></td>
            <td>${s.fecha}</td>
            <td>RD$ ${s.monto.toFixed(2)}</td>
            <td>${s.empleadaNombre}</td>
            <td>${bancas[s.banca]?.nombre || s.banca}</td>
            <td>${new Date(s.fechaSolicitud).toLocaleString()}</td>
            <td>
                <button class="btn btn-success btn-sm" onclick="abrirValidarTicket('${s.id}')">✅ Validar</button>
                <button class="btn btn-danger btn-sm" onclick="rechazarSolicitud('${s.id}')">❌ Rechazar</button>
            </td>
        </tr>`;
    });

    if (pendientes.length === 0) {
        html += `<tr><td colspan="7" style="text-align:center;">No hay solicitudes pendientes</td></tr>`;
    }

    html += `</tbody></table></div>`;
    document.getElementById('contentArea').innerHTML = html;
};

window.abrirValidarTicket = function(solicitudId) {
    const solicitud = ticketsSolicitados.find(s => s.id === solicitudId);
    if (!solicitud) return;

    document.getElementById('ticketInfo').innerHTML = `
        <div style="background:#f8f9fa; padding:15px; border-radius:8px;">
            <p><strong>Número:</strong> ${solicitud.numero}</p>
            <p><strong>Fecha:</strong> ${solicitud.fecha}</p>
            <p><strong>Monto:</strong> RD$ ${solicitud.monto.toFixed(2)}</p>
            <p><strong>Empleada:</strong> ${solicitud.empleadaNombre}</p>
            <p><strong>Banca:</strong> ${bancas[solicitud.banca]?.nombre}</p>
        </div>
    `;
    
    window.solicitudActual = solicitud;
    abrirModal('modalAprobarTicket');
};

window.aprobarTicket = async function(aprobar) {
    const solicitud = window.solicitudActual;
    if (!solicitud) return;

    const tipoDescuento = document.getElementById('descuentoTipo').value;

    if (aprobar) {
        if (solicitud.ticketId) {
            await db.ref(`tickets/${solicitud.ticketId}`).update({
                pagado: true,
                fechaPago: new Date().toISOString(),
                pagadoPor: solicitud.empleadaNombre
            });
        }

        if (tipoDescuento === 'comision') {
            await db.ref('gastos').push({
                tipo: 'ticket_pagado',
                empleadaId: solicitud.empleadaId,
                empleadaNombre: solicitud.empleadaNombre,
                banca: solicitud.banca,
                monto: solicitud.monto,
                fecha: new Date().toISOString().split('T')[0],
                descripcion: `Ticket #${solicitud.numero} pagado`,
                fechaRegistro: new Date().toISOString()
            });
        } else {
            await db.ref('faltantes').push({
                empleadaId: solicitud.empleadaId,
                empleadaNombre: solicitud.empleadaNombre,
                banca: solicitud.banca,
                fecha: new Date().toISOString().split('T')[0],
                monto: solicitud.monto,
                motivo: `Ticket #${solicitud.numero}`,
                descontado: false,
                fechaRegistro: new Date().toISOString()
            });
        }
    }

    await db.ref(`tickets_solicitados/${solicitud.id}`).update({
        estado: aprobar ? 'aprobado' : 'rechazado',
        fechaAprobacion: new Date().toISOString(),
        aprobadoPor: usuarioActual.nombre,
        tipoDescuento: aprobar ? tipoDescuento : null
    });

    cerrarModal('modalAprobarTicket');
    alert(aprobar ? '✅ Pago aprobado' : '❌ Solicitud rechazada');
    cargarSolicitudesTickets();
};

window.rechazarSolicitud = async function(id) {
    if (!confirm('¿Rechazar esta solicitud?')) return;
    await db.ref(`tickets_solicitados/${id}`).update({
        estado: 'rechazado',
        fechaRechazo: new Date().toISOString()
    });
    cargarSolicitudesTickets();
};

// ========== GASTOS ==========
window.cargarGastosAdmin = function() {
    document.getElementById('pageTitle').textContent = 'Registro de Gastos';

    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
    const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).toISOString().split('T')[0];

    let html = `
        <div class="acciones-rapidas">
            <button class="btn btn-primary" onclick="abrirModalGasto()">
                <i class="fa-solid fa-plus"></i> Nuevo Gasto
            </button>
        </div>
        <div class="filtros-card">
            <div class="filtros-row">
                <div><label>Desde</label><input type="date" id="filtroGastoDesde" class="form-control" value="${inicioMes}"></div>
                <div><label>Hasta</label><input type="date" id="filtroGastoHasta" class="form-control" value="${finMes}"></div>
                <div><label>Tipo</label>
                    <select id="filtroGastoTipo" class="form-control">
                        <option value="todos">Todos</option>
                        <option value="dieta">Dietas</option>
                        <option value="bono">Bonos</option>
                        <option value="dia_libre">Días Libres</option>
                        <option value="limpieza">Limpieza</option>
                        <option value="recarga">Recargas</option>
                        <option value="ticket_pagado">Tickets</option>
                        <option value="retiro_cliente">Retiro Cliente</option>
                        <option value="otro">Otros</option>
                    </select>
                </div>
                <div><label>Banca</label>
                    <select id="filtroGastoBanca" class="form-control">
                        <option value="todas">Todas</option>
                        <option value="kiko1">Banca Kiko 1</option>
                        <option value="kiko2">Banca Kiko 2</option>
                        <option value="kiko3">Banca Kiko 3</option>
                    </select>
                </div>
                <div><button class="btn btn-primary" onclick="filtrarGastos()">🔍 Filtrar</button></div>
            </div>
        </div>
        <div id="resultadosGastos"></div>
    `;

    document.getElementById('contentArea').innerHTML = html;
    filtrarGastos();
};

window.filtrarGastos = function() {
    const desde = document.getElementById('filtroGastoDesde').value;
    const hasta = document.getElementById('filtroGastoHasta').value;
    const tipo = document.getElementById('filtroGastoTipo').value;
    const banca = document.getElementById('filtroGastoBanca').value;

    let filtrados = [...gastos];

    if (desde) {
        filtrados = filtrados.filter(g => g.fecha >= desde);
    }
    if (hasta) {
        filtrados = filtrados.filter(g => g.fecha <= hasta);
    }
    if (tipo !== 'todos') {
        filtrados = filtrados.filter(g => g.tipo === tipo);
    }
    if (banca !== 'todas') {
        filtrados = filtrados.filter(g => g.banca === banca);
    }

    filtrados.sort((a,b) => new Date(b.fecha) - new Date(a.fecha));

    const total = filtrados.reduce((s,g) => s + (g.monto || 0), 0);

    let html = `
        <div class="stats-grid">
            <div class="stat-card danger"><div><h3>Total Gastos</h3><span class="number">RD$ ${total.toFixed(2)}</span></div></div>
        </div>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Tipo</th>
                        <th>Empleada/Cliente</th>
                        <th>Banca</th>
                        <th>Descripción</th>
                        <th>Monto</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
    `;

    filtrados.forEach(g => {
        const tipoTexto = {
            'dieta': '🍽️ Dieta',
            'bono': '🎁 Bono',
            'dia_libre': '🏖️ Día Libre',
            'limpieza': '🧹 Limpieza',
            'recarga': '📱 Recarga',
            'ticket_pagado': '🎫 Ticket',
            'retiro_cliente': '💸 Retiro Cliente',
            'otro': '📌 Otro'
        }[g.tipo] || g.tipo;

        const persona = g.clienteNombre || g.empleadaNombre || 'General';

        html += `<tr>
            <td>${g.fecha}</td>
            <td>${tipoTexto}</td>
            <td>${persona}</td>
            <td>${bancas[g.banca]?.nombre || 'General'}</td>
            <td>${g.descripcion || ''}</td>
            <td class="text-danger">RD$ ${g.monto.toFixed(2)}</td>
            <td>
                <button class="btn btn-danger btn-sm" onclick="eliminarGasto('${g.id}')"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>`;
    });

    if (filtrados.length === 0) {
        html += `<tr><td colspan="7" style="text-align:center;">No hay gastos</td></tr>`;
    }

    html += `</tbody></table></div>`;
    document.getElementById('resultadosGastos').innerHTML = html;
};

window.abrirModalGasto = function() {
    let empOptions = '<option value="">General (sin empleada)</option>';
    empleadas.forEach(e => {
        empOptions += `<option value="${e.id}">${e.nombre}</option>`;
    });
    document.getElementById('gastoEmpleada').innerHTML = empOptions;
    
    document.getElementById('gastoMonto').value = '';
    document.getElementById('gastoFecha').value = new Date().toISOString().split('T')[0];
    document.getElementById('gastoDescripcion').value = '';
    
    abrirModal('modalGasto');
};

window.guardarGasto = async function() {
    const tipo = document.getElementById('gastoTipo').value;
    const empleadaId = document.getElementById('gastoEmpleada').value;
    const monto = parseFloat(document.getElementById('gastoMonto').value);
    const fecha = document.getElementById('gastoFecha').value;
    const descripcion = document.getElementById('gastoDescripcion').value;

    if (!monto) return alert('Ingrese el monto');

    let empleadaNombre = null;
    let banca = null;

    if (empleadaId && empleadaId !== '') {
        const emp = empleadas.find(e => e.id === empleadaId);
        if (emp) {
            empleadaNombre = emp.nombre;
            banca = emp.banca;
        }
    }

    await db.ref('gastos').push({
        tipo,
        empleadaId: empleadaId || null,
        empleadaNombre,
        banca,
        monto,
        fecha,
        descripcion,
        fechaRegistro: new Date().toISOString()
    });

    cerrarModal('modalGasto');
    alert('✅ Gasto registrado');
    cargarGastosAdmin();
};

window.eliminarGasto = async function(id) {
    if (!confirm('¿Eliminar este gasto?')) return;
    await db.ref(`gastos/${id}`).remove();
    filtrarGastos();
};

// ========== PRÉSTAMOS ==========
window.cargarPrestamosAdmin = function() {
    document.getElementById('pageTitle').textContent = 'Préstamos';

    let html = `
        <div class="acciones-rapidas">
            <button class="btn btn-primary" onclick="abrirModalPrestamo()">
                <i class="fa-solid fa-plus"></i> Nuevo Préstamo
            </button>
        </div>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Tipo</th>
                        <th>Banca</th>
                        <th>Persona</th>
                        <th>Monto</th>
                        <th>Cuotas</th>
                        <th>Pagado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
    `;

    prestamos.sort((a,b) => new Date(b.fecha) - new Date(a.fecha)).forEach(p => {
        const tipoTexto = {
            'kiko_comision': 'Banca Kiko (+Comisión)',
            'central': 'Central',
            'empleada': 'A Empleada'
        }[p.tipo] || p.tipo;

        html += `<tr>
            <td>${p.fecha}</td>
            <td><span class="badge ${p.tipo === 'kiko_comision' ? 'warning' : p.tipo === 'central' ? 'info' : 'primary'}">${tipoTexto}</span></td>
            <td>${bancas[p.banca]?.nombre}</td>
            <td>${p.personaNombre}</td>
            <td class="text-danger">RD$ ${p.monto.toFixed(2)}</td>
            <td>${p.cuotas || 1}</td>
            <td><span class="badge ${p.pagado ? 'success' : 'warning'}">${p.pagado ? 'Sí' : 'No'}</span></td>
            <td>
                <button class="btn btn-success btn-sm" onclick="marcarCuotaPagada('${p.id}')">💰 Pagar Cuota</button>
                <button class="btn btn-danger btn-sm" onclick="eliminarPrestamo('${p.id}')"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>`;
    });

    if (prestamos.length === 0) {
        html += `<tr><td colspan="8" style="text-align:center;">No hay préstamos</td></tr>`;
    }

    html += `</tbody></table></div>`;
    document.getElementById('contentArea').innerHTML = html;
};

window.abrirModalPrestamo = function() {
    actualizarOpcionesPrestamo();
    
    document.getElementById('prestamoMonto').value = '';
    document.getElementById('prestamoFecha').value = new Date().toISOString().split('T')[0];
    document.getElementById('prestamoCuotas').value = '1';
    document.getElementById('prestamoMotivo').value = '';
    
    document.getElementById('cuotasDiv').style.display = 'block';
    
    abrirModal('modalPrestamo');
};

window.actualizarOpcionesPrestamo = function() {
    const tipo = document.getElementById('prestamoTipo').value;
    const selectPersona = document.getElementById('prestamoPersona');
    
    let options = '<option value="">Seleccionar</option>';
    
    if (tipo === 'empleada') {
        empleadas.forEach(e => {
            options += `<option value="${e.id}">${e.nombre}</option>`;
        });
        document.getElementById('cuotasDiv').style.display = 'block';
    } else {
        options += `<option value="banca">La Banca</option>`;
        clientes.filter(c => c.banca === document.getElementById('prestamoBanca').value).forEach(c => {
            options += `<option value="${c.id}">Cliente: ${c.nombre}</option>`;
        });
        document.getElementById('cuotasDiv').style.display = 'none';
    }
    
    selectPersona.innerHTML = options;
};

document.getElementById('prestamoTipo')?.addEventListener('change', actualizarOpcionesPrestamo);
document.getElementById('prestamoBanca')?.addEventListener('change', actualizarOpcionesPrestamo);

window.guardarPrestamo = async function() {
    const tipo = document.getElementById('prestamoTipo').value;
    const banca = document.getElementById('prestamoBanca').value;
    const personaId = document.getElementById('prestamoPersona').value;
    const monto = parseFloat(document.getElementById('prestamoMonto').value);
    const fecha = document.getElementById('prestamoFecha').value;
    const cuotas = parseInt(document.getElementById('prestamoCuotas').value) || 1;
    const motivo = document.getElementById('prestamoMotivo').value;

    if (!tipo || !banca || !personaId || !monto) {
        return alert('Complete todos los campos');
    }

    let personaNombre = '';
    if (tipo === 'empleada') {
        const emp = empleadas.find(e => e.id === personaId);
        personaNombre = emp?.nombre || '';
    } else if (personaId === 'banca') {
        personaNombre = bancas[banca]?.nombre || 'La Banca';
    } else {
        const cli = clientes.find(c => c.id === personaId);
        personaNombre = cli?.nombre || '';
    }

    await db.ref('prestamos').push({
        tipo,
        banca,
        personaId,
        personaNombre,
        monto,
        fecha,
        cuotas,
        cuotasPagadas: 0,
        montoPorCuota: monto / cuotas,
        motivo,
        pagado: false,
        fechaRegistro: new Date().toISOString()
    });

    cerrarModal('modalPrestamo');
    alert('✅ Préstamo registrado');
    cargarPrestamosAdmin();
};

window.marcarCuotaPagada = async function(id) {
    const prestamo = prestamos.find(p => p.id === id);
    if (!prestamo) return;

    const nuevasCuotasPagadas = (prestamo.cuotasPagadas || 0) + 1;
    const pagado = nuevasCuotasPagadas >= prestamo.cuotas;

    await db.ref(`prestamos/${id}`).update({
        cuotasPagadas: nuevasCuotasPagadas,
        pagado
    });

    alert('✅ Cuota marcada como pagada');
    cargarPrestamosAdmin();
};

window.eliminarPrestamo = async function(id) {
    if (!confirm('¿Eliminar este préstamo?')) return;
    await db.ref(`prestamos/${id}`).remove();
    cargarPrestamosAdmin();
};

window.cargarPrestamosEmpleada = function() {
    document.getElementById('pageTitle').textContent = 'Préstamos a Empleadas';

    const prestamosEmpleada = prestamos.filter(p => p.tipo === 'empleada');

    let html = `
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Empleada</th>
                        <th>Banca</th>
                        <th>Monto</th>
                        <th>Cuotas</th>
                        <th>Pagadas</th>
                        <th>Saldo</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
    `;

    prestamosEmpleada.forEach(p => {
        const saldo = p.monto - ((p.cuotasPagadas || 0) * p.montoPorCuota);
        html += `<tr>
            <td>${p.fecha}</td>
            <td>${p.personaNombre}</td>
            <td>${bancas[p.banca]?.nombre}</td>
            <td class="text-danger">RD$ ${p.monto.toFixed(2)}</td>
            <td>${p.cuotas}</td>
            <td>${p.cuotasPagadas || 0}</td>
            <td class="${saldo > 0 ? 'text-danger' : 'text-success'}">RD$ ${saldo.toFixed(2)}</td>
            <td><span class="badge ${p.pagado ? 'success' : 'warning'}">${p.pagado ? 'Pagado' : 'Pendiente'}</span></td>
        </tr>`;
    });

    if (prestamosEmpleada.length === 0) {
        html += `<tr><td colspan="8" style="text-align:center;">No hay préstamos a empleadas</td></tr>`;
    }

    html += `</tbody></table></div>`;
    document.getElementById('contentArea').innerHTML = html;
};

window.verMisPrestamos = function() {
    document.getElementById('pageTitle').textContent = 'Mis Préstamos';

    const misPrestamos = prestamos.filter(p => p.tipo === 'empleada' && p.personaId === usuarioActual.id);

    let html = `
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Monto</th>
                        <th>Cuotas</th>
                        <th>Pagadas</th>
                        <th>Saldo</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
    `;

    misPrestamos.forEach(p => {
        const saldo = p.monto - ((p.cuotasPagadas || 0) * p.montoPorCuota);
        html += `<tr>
            <td>${p.fecha}</td>
            <td class="text-danger">RD$ ${p.monto.toFixed(2)}</td>
            <td>${p.cuotas}</td>
            <td>${p.cuotasPagadas || 0}</td>
            <td class="${saldo > 0 ? 'text-danger' : 'text-success'}">RD$ ${saldo.toFixed(2)}</td>
            <td><span class="badge ${p.pagado ? 'success' : 'warning'}">${p.pagado ? 'Pagado' : 'Pendiente'}</span></td>
        </tr>`;
    });

    if (misPrestamos.length === 0) {
        html += `<tr><td colspan="6" style="text-align:center;">No tienes préstamos</td></tr>`;
    }

    html += `</tbody></table></div>`;
    document.getElementById('contentArea').innerHTML = html;
};

// ========== EMPLEADAS ==========
window.cargarEmpleadas = function() {
    document.getElementById('pageTitle').textContent = 'Gestión de Empleadas';
    
    let html = `
        <div class="acciones-rapidas">
            <button class="btn btn-primary" onclick="abrirModalNuevaEmpleada()">
                <i class="fa-solid fa-plus"></i> Nueva Empleada
            </button>
        </div>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Usuario</th>
                        <th>Nombre</th>
                        <th>Banca</th>
                        <th>WhatsApp</th>
                        <th>Sueldo</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
    `;

    empleadas.forEach(e => {
        html += `<tr>
            <td><code>${e.usuario}</code></td>
            <td><strong>${e.nombre}</strong></td>
            <td>${bancas[e.banca]?.nombre || e.banca}</td>
            <td><a href="https://wa.me/${e.whatsapp}" class="whatsapp-btn" target="_blank">📱 ${e.whatsapp}</a></td>
            <td>RD$ ${(e.sueldo || 0).toFixed(2)}</td>
            <td>
                <button class="btn btn-primary btn-sm" onclick="editarEmpleada('${e.id}')"><i class="fa-solid fa-edit"></i></button>
                <button class="btn btn-danger btn-sm" onclick="eliminarEmpleada('${e.id}')"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>`;
    });

    if (empleadas.length === 0) {
        html += `<tr><td colspan="6" style="text-align:center;">No hay empleadas registradas</td></tr>`;
    }

    html += `</tbody></table></div>`;
    document.getElementById('contentArea').innerHTML = html;
};

window.abrirModalNuevaEmpleada = function() {
    document.getElementById('modalEmpleadaTitulo').textContent = '➕ Nueva Empleada';
    document.getElementById('empleadaId').value = '';
    document.getElementById('empleadaNombre').value = '';
    document.getElementById('empleadaUsuario').value = '';
    document.getElementById('empleadaPassword').value = '';
    document.getElementById('empleadaWhatsapp').value = '';
    document.getElementById('empleadaSueldo').value = '0';
    document.getElementById('empleadaBanca').value = 'kiko1';
    abrirModal('modalEmpleada');
};

window.editarEmpleada = function(id) {
    const emp = empleadas.find(e => e.id === id);
    if (!emp) return;

    document.getElementById('modalEmpleadaTitulo').textContent = '✏️ Editar Empleada';
    document.getElementById('empleadaId').value = id;
    document.getElementById('empleadaNombre').value = emp.nombre || '';
    document.getElementById('empleadaUsuario').value = emp.usuario || '';
    document.getElementById('empleadaPassword').value = '';
    document.getElementById('empleadaWhatsapp').value = emp.whatsapp || '';
    document.getElementById('empleadaSueldo').value = emp.sueldo || 0;
    document.getElementById('empleadaBanca').value = emp.banca || 'kiko1';
    abrirModal('modalEmpleada');
};

window.guardarEmpleada = async function() {
    const id = document.getElementById('empleadaId').value;
    const nombre = document.getElementById('empleadaNombre').value;
    const usuario = document.getElementById('empleadaUsuario').value;
    const password = document.getElementById('empleadaPassword').value;
    const whatsapp = document.getElementById('empleadaWhatsapp').value.replace(/\D/g, '');
    const sueldo = parseFloat(document.getElementById('empleadaSueldo').value) || 0;
    const banca = document.getElementById('empleadaBanca').value;

    if (!nombre || !usuario || !whatsapp) {
        return alert('❌ Complete los campos obligatorios');
    }

    const datos = { 
        nombre, usuario, whatsapp, banca, sueldo,
        fechaActualizacion: new Date().toISOString() 
    };

    if (!id) {
        if (!password || password.length < 4) return alert('❌ Contraseña mínimo 4 caracteres');
        datos.password = password;
        datos.fechaRegistro = new Date().toISOString();
        await db.ref('empleadas').push(datos);
    } else {
        if (password) datos.password = password;
        await db.ref(`empleadas/${id}`).update(datos);
    }

    cerrarModal('modalEmpleada');
    alert(id ? '✅ Empleada actualizada' : '✅ Empleada creada');
    cargarEmpleadas();
};

window.eliminarEmpleada = async function(id) {
    if (!confirm('¿Eliminar empleada?')) return;
    await db.ref(`empleadas/${id}`).remove();
    cargarEmpleadas();
};

// ========== NÓMINAS ==========
window.abrirModalNomina = function() {
    let empOptions = '<option value="">Seleccionar empleada</option>';
    empleadas.forEach(e => {
        empOptions += `<option value="${e.id}">${e.nombre}</option>`;
    });
    document.getElementById('nominaEmpleada').innerHTML = empOptions;
    document.getElementById('resultadoNomina').innerHTML = '';
    abrirModal('modalNomina');
};

window.calcularNomina = function() {
    const empleadaId = document.getElementById('nominaEmpleada').value;
    const quincena = document.getElementById('nominaQuincena').value;
    
    if (!empleadaId) return alert('Seleccione una empleada');
    
    const emp = empleadas.find(e => e.id === empleadaId);
    if (!emp) return;
    
    const hoy = new Date();
    let inicio, fin;
    
    if (quincena === 'primera') {
        inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        fin = new Date(hoy.getFullYear(), hoy.getMonth(), 15);
    } else {
        inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 16);
        fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    }
    
    const inicioStr = inicio.toISOString().split('T')[0];
    const finStr = fin.toISOString().split('T')[0];
    
    const faltantesEmpleada = faltantes.filter(f => 
        f.empleadaId === empleadaId && 
        !f.descontado &&
        f.fecha >= inicioStr && 
        f.fecha <= finStr
    );
    
    const totalFaltantes = faltantesEmpleada.reduce((s,f) => s + f.monto, 0);
    
    const prestamosEmpleada = prestamos.filter(p => 
        p.tipo === 'empleada' && 
        p.personaId === empleadaId && 
        !p.pagado
    );
    
    const cuotasPrestamos = prestamosEmpleada.reduce((s,p) => {
        const cuotasRestantes = p.cuotas - (p.cuotasPagadas || 0);
        return s + (p.montoPorCuota * cuotasRestantes);
    }, 0);
    
    const sueldoBase = emp.sueldo || 0;
    const totalDescuentos = totalFaltantes + cuotasPrestamos;
    const totalPagar = sueldoBase - totalDescuentos;
    
    let descuentosHtml = '';
    if (faltantesEmpleada.length > 0) {
        descuentosHtml += `
            <h4>Faltantes a descontar:</h4>
            <ul style="list-style:none; padding:0;">
                ${faltantesEmpleada.map(f => `<li class="text-danger">${f.fecha}: RD$ ${f.monto.toFixed(2)}</li>`).join('')}
            </ul>
        `;
    }
    
    if (prestamosEmpleada.length > 0) {
        descuentosHtml += `
            <h4>Préstamos a descontar:</h4>
            <ul style="list-style:none; padding:0;">
                ${prestamosEmpleada.map(p => `<li class="text-danger">Préstamo: RD$ ${(p.montoPorCuota * (p.cuotas - (p.cuotasPagadas || 0))).toFixed(2)} (${p.cuotas - (p.cuotasPagadas || 0)} cuotas)</li>`).join('')}
            </ul>
        `;
    }
    
    let html = `
        <div style="background:#f8f9fa; padding:20px; border-radius:8px;">
            <h4>Nómina de ${emp.nombre}</h4>
            <p><strong>Período:</strong> ${inicioStr} al ${finStr}</p>
            <hr>
            <p><strong>Sueldo Base:</strong> RD$ ${sueldoBase.toFixed(2)}</p>
            ${descuentosHtml}
            <hr>
            <h3>Total a Pagar: RD$ ${totalPagar.toFixed(2)}</h3>
            ${totalDescuentos > 0 ? `<p class="text-danger">(Descuentos: RD$ ${totalDescuentos.toFixed(2)})</p>` : ''}
        </div>
    `;
    
    document.getElementById('resultadoNomina').innerHTML = html;
    
    window.nominaCalculada = {
        empleadaId,
        empleadaNombre: emp.nombre,
        empleadaWhatsapp: emp.whatsapp,
        periodo: quincena,
        inicio: inicioStr,
        fin: finStr,
        sueldoBase,
        faltantes: totalFaltantes,
        prestamos: cuotasPrestamos,
        totalDescuentos,
        totalPagar
    };
};

window.pagarNominaCalculada = async function() {
    if (!window.nominaCalculada) return alert('Primero calcule la nómina');
    
    if (!confirm(`¿Pagar RD$ ${window.nominaCalculada.totalPagar.toFixed(2)} a ${window.nominaCalculada.empleadaNombre}?`)) return;
    
    await db.ref('nominas').push({
        ...window.nominaCalculada,
        fechaPago: new Date().toISOString().split('T')[0],
        pagado: true,
        fechaRegistro: new Date().toISOString()
    });
    
    const faltantesPeriodo = faltantes.filter(f => 
        f.empleadaId === window.nominaCalculada.empleadaId && 
        !f.descontado &&
        f.fecha >= window.nominaCalculada.inicio && 
        f.fecha <= window.nominaCalculada.fin
    );
    
    for (let f of faltantesPeriodo) {
        await db.ref(`faltantes/${f.id}`).update({ descontado: true });
    }
    
    const prestamosEmpleada = prestamos.filter(p => 
        p.tipo === 'empleada' && 
        p.personaId === window.nominaCalculada.empleadaId && 
        !p.pagado
    );
    
    for (let p of prestamosEmpleada) {
        await db.ref(`prestamos/${p.id}`).update({
            cuotasPagadas: p.cuotas,
            pagado: true
        });
    }
    
    alert('✅ Nómina pagada');
    cerrarModal('modalNomina');
    enviarComprobanteNomina();
};

window.enviarComprobanteNomina = function() {
    if (!window.nominaCalculada) return alert('Primero calcule la nómina');
    
    const nomina = window.nominaCalculada;
    const whatsapp = nomina.empleadaWhatsapp;
    
    if (!whatsapp) {
        alert('La empleada no tiene WhatsApp configurado');
        return;
    }
    
    const mensaje = `
*BANCAS KIKO*
*COMPROBANTE DE NÓMINA*

Empleada: ${nomina.empleadaNombre}
Período: ${nomina.inicio} al ${nomina.fin}

Sueldo Base: RD$ ${nomina.sueldoBase.toFixed(2)}
Descuentos:
- Faltantes: RD$ ${nomina.faltantes.toFixed(2)}
- Préstamos: RD$ ${nomina.prestamos.toFixed(2)}
Total Descuentos: RD$ ${nomina.totalDescuentos.toFixed(2)}

*TOTAL PAGADO: RD$ ${nomina.totalPagar.toFixed(2)}*

Fecha de pago: ${new Date().toLocaleDateString()}

¡Gracias por tu trabajo!
    `;
    
    window.open(`https://wa.me/${whatsapp}?text=${encodeURIComponent(mensaje)}`, '_blank');
};

window.verMiNomina = function() {
    document.getElementById('pageTitle').textContent = 'Mi Nómina';

    const misNominas = nominas.filter(n => n.empleadaId === usuarioActual.id);

    let html = `
        <div class="stats-grid">
            <div class="stat-card primary"><div><h3>Sueldo Base</h3><span class="number">RD$ ${(usuarioActual.sueldo || 0).toFixed(2)}</span></div></div>
        </div>
        
        <h3>📋 Historial de Pagos</h3>
        <div class="table-container">
            <table>
                <thead><tr><th>Fecha</th><th>Período</th><th>Sueldo</th><th>Descuentos</th><th>Total Pagado</th></tr></thead>
                <tbody>
                    ${misNominas.map(n => `
                        <tr>
                            <td>${n.fechaPago}</td>
                            <td>${n.inicio} al ${n.fin}</td>
                            <td>RD$ ${(n.sueldoBase || 0).toFixed(2)}</td>
                            <td class="text-danger">RD$ ${(n.totalDescuentos || 0).toFixed(2)}</td>
                            <td class="text-success"><strong>RD$ ${(n.totalPagar || 0).toFixed(2)}</strong></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    if (misNominas.length === 0) {
        html += `<p style="text-align:center;">No hay nóminas pagadas aún</p>`;
    }

    document.getElementById('contentArea').innerHTML = html;
};

// ========== FONDOS DE BANCAS ==========
window.verFondosBancas = function() {
    let html = '<div class="fondos-list">';
    
    for (let [key, banca] of Object.entries(bancas)) {
        const clientesBanca = clientes.filter(c => c.banca === key);
        const deudaTotal = clientesBanca.reduce((s,c) => s + (c.deuda || 0), 0);
        const fondoTotal = clientesBanca.reduce((s,c) => s + (c.fondo || 0), 0);
        const fondoDisponible = (banca.fondo || 0) - deudaTotal;
        const fondoClass = fondoDisponible < 0 ? 'text-danger' : 'text-success';
        const estadoTexto = fondoDisponible < 0 ? 'RIESGO' : 'DISPONIBLE';
        
        html += `
            <div class="fondo-item">
                <div class="fondo-info">
                    <h4>${banca.nombre}</h4>
                    <small>Último cuadre: ${banca.ultimoCuadre || 'Nunca'}</small>
                </div>
                <div>
                    <div><strong>Fondo bruto:</strong> <span class="fondo-monto">RD$ ${(banca.fondo || 0).toFixed(2)}</span></div>
                    <div><strong>Deuda clientes:</strong> <span class="text-danger">RD$ ${deudaTotal.toFixed(2)}</span></div>
                    <div><strong>Fondo clientes:</strong> <span class="text-success">RD$ ${fondoTotal.toFixed(2)}</span></div>
                    <div><strong>Fondo disponible:</strong> <span class="${fondoClass}">RD$ ${Math.abs(fondoDisponible).toFixed(2)} <span class="badge ${fondoDisponible < 0 ? 'danger' : 'success'}">${estadoTexto}</span></span></div>
                </div>
                <div>
                    <input type="number" id="fondo_${key}" class="form-control" value="${banca.fondo || 0}" style="width:150px;" placeholder="Ajustar fondo">
                    <button class="btn btn-success btn-sm" onclick="actualizarFondo('${key}')">Actualizar</button>
                </div>
            </div>
        `;
    }

    html += '</div>';
    document.getElementById('fondosList').innerHTML = html;
    abrirModal('modalFondos');
};

window.actualizarFondo = async function(bancaKey) {
    const nuevoFondo = parseFloat(document.getElementById(`fondo_${bancaKey}`).value) || 0;
    bancas[bancaKey].fondo = nuevoFondo;
    bancas[bancaKey].historial = bancas[bancaKey].historial || [];
    bancas[bancaKey].historial.push({ 
        fecha: new Date().toISOString().split('T')[0], 
        fondo: nuevoFondo 
    });
    
    await db.ref(`fondos_bancas/${bancaKey}`).set(bancas[bancaKey]);
    alert('✅ Fondo actualizado');
    verFondosBancas();
};

// ========== CUADRES POR BANCA (VER HISTORIAL) ==========
window.cargarCuadresBancaAdmin = function() {
    document.getElementById('pageTitle').textContent = 'Cuadres de Empleadas';

    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
    const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).toISOString().split('T')[0];

    let html = `
        <div class="filtros-card">
            <h3>Filtrar Cuadres</h3>
            <div class="filtros-row">
                <div><label>Desde</label><input type="date" id="filtroBancaDesde" class="form-control" value="${inicioMes}"></div>
                <div><label>Hasta</label><input type="date" id="filtroBancaHasta" class="form-control" value="${finMes}"></div>
                <div><label>Banca</label>
                    <select id="filtroBancaSelect" class="form-control">
                        <option value="todas">Todas</option>
                        <option value="kiko1">Banca Kiko 1</option>
                        <option value="kiko2">Banca Kiko 2</option>
                        <option value="kiko3">Banca Kiko 3</option>
                    </select>
                </div>
                <div><label>Empleada</label>
                    <select id="filtroEmpleadaSelect" class="form-control">
                        <option value="todas">Todas</option>
                        ${empleadas.map(e => `<option value="${e.id}">${e.nombre}</option>`).join('')}
                    </select>
                </div>
                <div><button class="btn btn-primary" onclick="filtrarCuadresBanca()">🔍 Filtrar</button></div>
            </div>
        </div>
        <div id="resultadosCuadresBanca"></div>
    `;

    document.getElementById('contentArea').innerHTML = html;
    filtrarCuadresBanca();
};

window.filtrarCuadresBanca = function() {
    const desde = document.getElementById('filtroBancaDesde').value;
    const hasta = document.getElementById('filtroBancaHasta').value;
    const banca = document.getElementById('filtroBancaSelect').value;
    const empleadaId = document.getElementById('filtroEmpleadaSelect').value;

    let filtrados = cuadresBanca.filter(c => {
        return c.fechaHasta >= desde && c.fechaHasta <= hasta;
    });

    if (banca !== 'todas') {
        filtrados = filtrados.filter(c => c.banca === banca);
    }
    if (empleadaId !== 'todas') {
        filtrados = filtrados.filter(c => c.empleadaId === empleadaId);
    }

    let html = `
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Período</th>
                        <th>Empleada</th>
                        <th>Banca</th>
                        <th>F.Inicial</th>
                        <th>Vta.Comisión</th>
                        <th>Vta.Central</th>
                        <th>Recargas</th>
                        <th>Prést.Kiko</th>
                        <th>Prést.Cent</th>
                        <th>Devoluc.</th>
                        <th>Transfer.</th>
                        <th>Gastos</th>
                        <th>Efectivo</th>
                        <th>Diferencia</th>
                    </tr>
                </thead>
                <tbody>
    `;

    filtrados.sort((a,b) => new Date(b.fechaHasta) - new Date(a.fechaHasta)).forEach(c => {
        const claseDiff = c.diferencia > 0 ? 'text-warning' : c.diferencia < 0 ? 'text-danger' : 'text-success';
        html += `<tr>
            <td>${c.fechaDesde} al ${c.fechaHasta}</td>
            <td>${c.empleadaNombre}</td>
            <td>${bancas[c.banca]?.nombre || c.banca}</td>
            <td>RD$ ${(c.fondoInicial || 0).toFixed(2)}</td>
            <td>RD$ ${(c.ventaComision || 0).toFixed(2)}</td>
            <td>RD$ ${(c.ventaCentral || 0).toFixed(2)}</td>
            <td>RD$ ${(c.recargasExternas || 0).toFixed(2)}</td>
            <td>RD$ ${(c.prestamosComision || 0).toFixed(2)}</td>
            <td>RD$ ${(c.prestamosCentral || 0).toFixed(2)}</td>
            <td>RD$ ${(c.devoluciones || 0).toFixed(2)}</td>
            <td>RD$ ${(c.transferencias || 0).toFixed(2)}</td>
            <td>RD$ ${(c.gastos || 0).toFixed(2)}</td>
            <td>RD$ ${(c.totalEfectivo || 0).toFixed(2)}</td>
            <td class="${claseDiff}">RD$ ${(c.diferencia || 0).toFixed(2)}</td>
        </tr>`;
    });

    if (filtrados.length === 0) {
        html += `<tr><td colspan="14" style="text-align:center;">No hay cuadres</td></tr>`;
    }

    html += `</tbody></table></div>`;
    document.getElementById('resultadosCuadresBanca').innerHTML = html;
};

// ========== REPORTES ==========
window.cargarReportes = function() {
    document.getElementById('pageTitle').textContent = 'Reportes';

    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
    const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).toISOString().split('T')[0];

    let html = `
        <div class="filtros-card">
            <h3>Generar Reporte</h3>
            <div class="filtros-row">
                <div><label>Desde</label><input type="date" id="reporteDesde" class="form-control" value="${inicioMes}"></div>
                <div><label>Hasta</label><input type="date" id="reporteHasta" class="form-control" value="${finMes}"></div>
                <div><label>Tipo</label>
                    <select id="reporteTipo" class="form-control">
                        <option value="cuadres_admin">Cuadres Generales</option>
                        <option value="cuadres_banca">Cuadres de Empleadas</option>
                        <option value="clientes">Clientes</option>
                        <option value="premios">Premios</option>
                        <option value="tickets">Tickets Pagados</option>
                        <option value="gastos">Gastos</option>
                        <option value="deudas">Deudas/Pagos</option>
                        <option value="prestamos">Préstamos</option>
                        <option value="faltantes">Faltantes</option>
                        <option value="transferencias">Transferencias</option>
                    </select>
                </div>
                <div><label>Banca</label>
                    <select id="reporteBanca" class="form-control">
                        <option value="todas">Todas</option>
                        <option value="kiko1">Banca Kiko 1</option>
                        <option value="kiko2">Banca Kiko 2</option>
                        <option value="kiko3">Banca Kiko 3</option>
                    </select>
                </div>
                <div><button class="btn btn-primary" onclick="generarReporte()">📊 Generar</button></div>
                <div><button class="btn btn-success" onclick="exportarReportePDF()">📄 PDF</button></div>
            </div>
        </div>
        <div id="reporteResultados"></div>
    `;

    document.getElementById('contentArea').innerHTML = html;
};

window.generarReporte = function() {
    const desde = document.getElementById('reporteDesde').value;
    const hasta = document.getElementById('reporteHasta').value;
    const tipo = document.getElementById('reporteTipo').value;
    const banca = document.getElementById('reporteBanca').value;

    let html = '<h3>Reporte Generado</h3>';
    let filtrados = [];
    let total = 0;

    if (tipo === 'cuadres_admin') {
        filtrados = cuadresAdmin.filter(c => c.fecha >= desde && c.fecha <= hasta);
        if (banca !== 'todas') filtrados = filtrados.filter(c => c.banca === banca);
        
        html += `
            <div class="table-container">
                <table>
                    <thead><tr><th>Fecha</th><th>Banca</th><th>F.Inicial</th><th>Vta.Comisión</th><th>Vta.Central</th><th>Recargas</th><th>Prést.Kiko</th><th>Prést.Cent</th><th>Gastos</th><th>F.Final</th></tr></thead>
                    <tbody>
                        ${filtrados.map(c => `<tr><td>${c.fecha}</td><td>${bancas[c.banca]?.nombre}</td><td>RD$ ${(c.fondoInicial||0).toFixed(2)}</td><td>RD$ ${(c.ventaComision||0).toFixed(2)}</td><td>RD$ ${(c.ventaCentral||0).toFixed(2)}</td><td>RD$ ${(c.recargasExternas||0).toFixed(2)}</td><td>RD$ ${(c.prestamosKiko||0).toFixed(2)}</td><td>RD$ ${(c.prestamosCentral||0).toFixed(2)}</td><td>RD$ ${(c.gastos||0).toFixed(2)}</td><td>RD$ ${(c.fondoFinal||0).toFixed(2)}</td></tr>`).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } else if (tipo === 'cuadres_banca') {
        filtrados = cuadresBanca.filter(c => c.fechaHasta >= desde && c.fechaHasta <= hasta);
        if (banca !== 'todas') filtrados = filtrados.filter(c => c.banca === banca);
        
        html += `
            <div class="table-container">
                <table>
                    <thead><tr><th>Período</th><th>Empleada</th><th>Banca</th><th>Dif.</th></tr></thead>
                    <tbody>
                        ${filtrados.map(c => `<tr><td>${c.fechaDesde} al ${c.fechaHasta}</td><td>${c.empleadaNombre}</td><td>${bancas[c.banca]?.nombre}</td><td class="${c.diferencia>0?'text-warning':c.diferencia<0?'text-danger':'text-success'}">RD$ ${(c.diferencia||0).toFixed(2)}</td></tr>`).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } else if (tipo === 'clientes') {
        let clientesFiltrados = clientes;
        if (banca !== 'todas') clientesFiltrados = clientesFiltrados.filter(c => c.banca === banca);
        
        html += `
            <div class="table-container">
                <table>
                    <thead><tr><th>Nombre</th><th>Banca</th><th>Deuda</th><th>Fondo</th><th>Fondo Neto</th><th>Última Act.</th></tr></thead>
                    <tbody>
                        ${clientesFiltrados.map(c => {
                            const fondoNeto = getFondoCliente(c);
                            const fondoNetoClass = fondoNeto < 0 ? 'text-danger' : 'text-success';
                            let fechaAct = 'Nunca';
                            if (c.fechaActualizacion) {
                                fechaAct = new Date(c.fechaActualizacion).toLocaleString();
                            }
                            return `<tr>
                                <td>${c.nombre}</td>
                                <td>${bancas[c.banca]?.nombre}</td>
                                <td class="${c.deuda>0?'text-danger':'text-success'}">RD$ ${(c.deuda||0).toFixed(2)}</td>
                                <td class="text-success">RD$ ${(c.fondo||0).toFixed(2)}</td>
                                <td class="${fondoNetoClass}">RD$ ${fondoNeto.toFixed(2)}</td>
                                <td>${fechaAct}</td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } else if (tipo === 'premios') {
        filtrados = premios.filter(p => p.fecha >= desde && p.fecha <= hasta);
        
        html += `
            <div class="table-container">
                <table>
                    <thead><tr><th>Fecha</th><th>Cliente</th><th>Loterías</th><th>Monto</th><th>Deuda Ant.</th><th>Deuda Nueva</th><th>Fondo Nuevo</th></tr></thead>
                    <tbody>
                        ${filtrados.map(p => `<tr><td>${p.fecha}</td><td>${p.clienteNombre}</td><td>${Array.isArray(p.loterias)?p.loterias.join(', '):p.loteria||''}</td><td class="text-success">RD$ ${p.monto.toFixed(2)}</td><td>RD$ ${(p.deudaAnterior||0).toFixed(2)}</td><td>RD$ ${(p.deudaNueva||0).toFixed(2)}</td><td>RD$ ${(p.fondoNuevo||0).toFixed(2)}</td></tr>`).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } else if (tipo === 'tickets') {
        filtrados = ticketsSolicitados.filter(t => t.estado === 'aprobado' && t.fechaAprobacion?.split('T')[0] >= desde && t.fechaAprobacion?.split('T')[0] <= hasta);
        if (banca !== 'todas') filtrados = filtrados.filter(t => t.banca === banca);
        
        total = filtrados.reduce((s,t) => s + t.monto, 0);
        
        html += `
            <div class="stats-grid">
                <div class="stat-card success"><div><h3>Total Pagado</h3><span class="number">RD$ ${total.toFixed(2)}</span></div></div>
            </div>
            <div class="table-container">
                <table>
                    <thead><tr><th>Fecha</th><th>Número</th><th>Monto</th><th>Empleada</th><th>Banca</th></tr></thead>
                    <tbody>
                        ${filtrados.map(t => `<tr><td>${t.fechaAprobacion?.split('T')[0]}</td><td><code>${t.numero}</code></td><td>RD$ ${t.monto.toFixed(2)}</td><td>${t.empleadaNombre}</td><td>${bancas[t.banca]?.nombre}</td></tr>`).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } else if (tipo === 'gastos') {
        filtrados = gastos.filter(g => g.fecha >= desde && g.fecha <= hasta);
        if (banca !== 'todas') filtrados = filtrados.filter(g => g.banca === banca);
        
        total = filtrados.reduce((s,g) => s + g.monto, 0);
        
        html += `
            <div class="stats-grid">
                <div class="stat-card danger"><div><h3>Total Gastos</h3><span class="number">RD$ ${total.toFixed(2)}</span></div></div>
            </div>
            <div class="table-container">
                <table>
                    <thead><tr><th>Fecha</th><th>Tipo</th><th>Empleada/Cliente</th><th>Banca</th><th>Monto</th></tr></thead>
                    <tbody>
                        ${filtrados.map(g => {
                            const persona = g.clienteNombre || g.empleadaNombre || 'General';
                            return `<tr><td>${g.fecha}</td><td>${g.tipo}</td><td>${persona}</td><td>${bancas[g.banca]?.nombre || 'General'}</td><td class="text-danger">RD$ ${g.monto.toFixed(2)}</td></tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } else if (tipo === 'deudas') {
        filtrados = deudas.filter(d => d.fecha >= desde && d.fecha <= hasta);
        
        html += `
            <div class="table-container">
                <table>
                    <thead><tr><th>Fecha</th><th>Hora</th><th>Cliente</th><th>Tipo</th><th>Forma Pago</th><th>Monto</th><th>Concepto</th><th>Deuda Ant.</th><th>Deuda Nueva</th><th>Fondo Ant.</th><th>Fondo Nuevo</th></tr></thead>
                    <tbody>
                        ${filtrados.map(d => `<tr>
                            <td>${d.fecha}</td>
                            <td>${d.hora || ''}</td>
                            <td>${d.clienteNombre}</td>
                            <td>${d.tipo === 'deuda' ? '➕ Deuda' : '➖ Pago'}</td>
                            <td>${getFormaPagoIcon(d.formaPago)}</td>
                            <td class="${d.tipo === 'deuda' ? 'text-danger' : 'text-success'}">RD$ ${Math.abs(d.monto).toFixed(2)}</td>
                            <td>${d.concepto || ''}</td>
                            <td>RD$ ${(d.deudaAnterior || 0).toFixed(2)}</td>
                            <td>RD$ ${(d.deudaNueva || 0).toFixed(2)}</td>
                            <td>RD$ ${(d.fondoAnterior || 0).toFixed(2)}</td>
                            <td>RD$ ${(d.fondoNuevo || 0).toFixed(2)}</td>
                        </tr>`).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } else if (tipo === 'prestamos') {
        filtrados = prestamos.filter(p => p.fecha >= desde && p.fecha <= hasta);
        if (banca !== 'todas') filtrados = filtrados.filter(p => p.banca === banca);
        
        html += `
            <div class="table-container">
                <table>
                    <thead><tr><th>Fecha</th><th>Tipo</th><th>Banca</th><th>Persona</th><th>Monto</th><th>Estado</th></tr></thead>
                    <tbody>
                        ${filtrados.map(p => `<tr><td>${p.fecha}</td><td>${p.tipo}</td><td>${bancas[p.banca]?.nombre}</td><td>${p.personaNombre}</td><td class="text-danger">RD$ ${p.monto.toFixed(2)}</td><td><span class="badge ${p.pagado ? 'success' : 'warning'}">${p.pagado ? 'Pagado' : 'Pendiente'}</span></td></tr>`).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } else if (tipo === 'faltantes') {
        filtrados = faltantes.filter(f => f.fecha >= desde && f.fecha <= hasta);
        if (banca !== 'todas') filtrados = filtrados.filter(f => f.banca === banca);
        
        const noDescontados = filtrados.filter(f => !f.descontado).reduce((s,f) => s + f.monto, 0);
        const descontados = filtrados.filter(f => f.descontado).reduce((s,f) => s + f.monto, 0);
        
        html += `
            <div class="stats-grid">
                <div class="stat-card danger"><div><h3>No Descontados</h3><span class="number">RD$ ${noDescontados.toFixed(2)}</span></div></div>
                <div class="stat-card success"><div><h3>Descontados</h3><span class="number">RD$ ${descontados.toFixed(2)}</span></div></div>
            </div>
            <div class="table-container">
                <table>
                    <thead><tr><th>Fecha</th><th>Empleada</th><th>Banca</th><th>Monto</th><th>Estado</th></tr></thead>
                    <tbody>
                        ${filtrados.map(f => `<tr><td>${f.fecha}</td><td>${f.empleadaNombre}</td><td>${bancas[f.banca]?.nombre}</td><td class="text-danger">RD$ ${f.monto.toFixed(2)}</td><td><span class="badge ${f.descontado ? 'success' : 'warning'}">${f.descontado ? 'Descontado' : 'Pendiente'}</span></td></tr>`).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } else if (tipo === 'transferencias') {
        filtrados = transferencias.filter(t => t.fecha >= desde && t.fecha <= hasta);
        if (banca !== 'todas') filtrados = filtrados.filter(t => t.banca === banca);
        
        total = filtrados.reduce((s,t) => s + t.monto, 0);
        
        html += `
            <div class="stats-grid">
                <div class="stat-card info"><div><h3>Total Transferencias</h3><span class="number">RD$ ${total.toFixed(2)}</span></div></div>
            </div>
            <div class="table-container">
                <table>
                    <thead><tr><th>Fecha</th><th>Hora</th><th>Banca</th><th>Origen</th><th>Destino</th><th>Referencia</th><th>Monto</th><th>Concepto</th><th>Estado</th></tr></thead>
                    <tbody>
                        ${filtrados.map(t => {
                            const hora = t.fechaRegistro ? new Date(t.fechaRegistro).toLocaleTimeString() : '';
                            return `<tr>
                                <td>${t.fecha}</td>
                                <td>${hora}</td>
                                <td>${bancas[t.banca]?.nombre}</td>
                                <td>${t.bancoOrigen}</td>
                                <td>${t.bancoDestino}</td>
                                <td><code>${t.referencia}</code></td>
                                <td class="text-danger">RD$ ${t.monto.toFixed(2)}</td>
                                <td>${t.concepto || ''}</td>
                                <td><span class="badge ${t.estado === 'aprobado' ? 'success' : 'warning'}">${t.estado || 'pendiente'}</span></td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    document.getElementById('reporteResultados').innerHTML = html;
    window.reporteActual = { tipo, desde, hasta, data: html };
};

window.exportarReportePDF = function() {
    if (!window.reporteActual) return alert('Genere un reporte primero');
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text('Bancas Kiko - Reporte', 14, 20);
    doc.setFontSize(12);
    doc.text(`Tipo: ${window.reporteActual.tipo}`, 14, 30);
    doc.text(`Período: ${window.reporteActual.desde} al ${window.reporteActual.hasta}`, 14, 38);
    
    doc.save(`reporte_${new Date().toISOString().split('T')[0]}.pdf`);
};

// ========== INICIALIZACIÓN ==========
window.onload = function() {
    actualizarFecha();
    cargarDatosIniciales();
    abrirModal('modalLogin');
};

