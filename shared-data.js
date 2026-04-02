/**
 * 시공관리 플랫폼 — Firebase 연동 공통 데이터 레이어
 * 모든 기기에서 실시간 동기화
 */

// Firebase SDK (CDN 버전용 — 전역 변수 사용)
const firebaseConfig = {
    apiKey: "AIzaSyDYxga3vCyoGh-5tCut6XMwl7kyys4tmbc",
    authDomain: "sigong-manager.firebaseapp.com",
    databaseURL: "https://sigong-manager-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "sigong-manager",
    storageBucket: "sigong-manager.firebasestorage.app",
    messagingSenderId: "617085513185",
    appId: "1:617085513185:web:dc8995207bea22595276a0"
};

let firebaseApp, firebaseDb;

function initFirebase() {
    firebaseApp = firebase.initializeApp(firebaseConfig);
    firebaseDb = firebase.database();
}

// ===== DB Layer =====
const DB = {
    _cache: {},
    _listeners: {},
    _ready: false,
    _readyCallbacks: [],

    init() {
        initFirebase();
        // Load all collections and listen for changes
        const collections = ['accounts','companies','workers','jobs','asTickets','feedback','notifications'];
        let loaded = 0;
        collections.forEach(key => {
            const ref = firebaseDb.ref(key);
            ref.on('value', (snap) => {
                const data = snap.val();
                this._cache[key] = data ? Object.values(data) : [];
                // Notify listeners
                (this._listeners[key] || []).forEach(fn => fn('sync', null));
                loaded++;
                if (loaded >= collections.length && !this._ready) {
                    this._ready = true;
                    this._readyCallbacks.forEach(fn => fn());
                }
            });
        });
    },

    onReady(fn) {
        if (this._ready) fn();
        else this._readyCallbacks.push(fn);
    },

    // Initialize default data if DB is empty
    async seedIfEmpty() {
        const snap = await firebaseDb.ref('accounts').once('value');
        if (snap.exists()) return; // Already has data
        console.log('Seeding initial data...');
        await firebaseDb.ref('accounts').set(this._arrayToObj(DEFAULT_ACCOUNTS));
        await firebaseDb.ref('companies').set(this._arrayToObj(DEFAULT_COMPANIES));
        await firebaseDb.ref('workers').set(this._arrayToObj(DEFAULT_WORKERS));
        await firebaseDb.ref('jobs').set(this._arrayToObj(DEFAULT_JOBS));
        await firebaseDb.ref('asTickets').set(this._arrayToObj(DEFAULT_AS));
        await firebaseDb.ref('feedback').set(this._arrayToObj(DEFAULT_FEEDBACK));
        await firebaseDb.ref('notifications').set(this._arrayToObj(DEFAULT_NOTIFICATIONS));
        console.log('Seed complete.');
    },

    _arrayToObj(arr) {
        const obj = {};
        arr.forEach(item => { obj[item.id] = item; });
        return obj;
    },

    // CRUD
    getAll(key) { return this._cache[key] || []; },
    getById(key, id) { return (this._cache[key] || []).find(r => r.id === id); },

    add(key, record) {
        firebaseDb.ref(key + '/' + record.id).set(record);
        return record;
    },

    update(key, id, updates) {
        const existing = this.getById(key, id);
        if (!existing) return null;
        const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
        firebaseDb.ref(key + '/' + id).set(updated);
        return updated;
    },

    // Listen for changes
    onChange(key, fn) {
        if (!this._listeners[key]) this._listeners[key] = [];
        this._listeners[key].push(fn);
    },

    // Compat: listenSync (no-op, firebase handles it)
    listenSync(callback) {
        ['jobs','asTickets','feedback','notifications','companies'].forEach(key => {
            this.onChange(key, () => callback(key, 'sync', null));
        });
    },

    // ID generator
    genId(prefix) {
        const d = new Date();
        const ds = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
        const rnd = String(Math.floor(Math.random()*1000)).padStart(3,'0');
        return `${prefix}-${ds}-${rnd}`;
    },

    // Force reseed
    async reset() {
        await firebaseDb.ref().remove();
        await this.seedIfEmpty();
    }
};

// ===== DEFAULT DATA (same as before) =====

const DEFAULT_ACCOUNTS = [
    { id:'acc-001', loginId:'admin', password:'admin123', name:'김관리', role:'admin', companyId:null, avatar:'AD' },
    { id:'acc-002', loginId:'first-cs', password:'first123', name:'박승현', role:'tech', companyId:'comp-001', avatar:'PS' },
    { id:'acc-003', loginId:'first-mgr', password:'first123', name:'이매니저', role:'tech-mgr', companyId:'comp-001', avatar:'IM' },
    { id:'acc-004', loginId:'juwon', password:'juwon123', name:'최대표', role:'tech', companyId:'comp-002', avatar:'CD' },
    { id:'acc-005', loginId:'yj-tech', password:'yj123', name:'김대표', role:'tech', companyId:'comp-003', avatar:'영' },
    { id:'acc-006', loginId:'worksite', password:'work123', name:'정대표', role:'tech', companyId:'comp-004', avatar:'JD' },
    { id:'acc-007', loginId:'grape', password:'grape123', name:'한대표', role:'tech', companyId:'comp-005', avatar:'HD' },
    { id:'acc-008', loginId:'samton', password:'sam123', name:'오대표', role:'tech', companyId:'comp-006', avatar:'OD' },
    { id:'acc-w01', loginId:'kim.th', password:'1234', name:'김태현', role:'worker', companyId:'comp-001', workerId:'w-001', avatar:'김' },
    { id:'acc-w02', loginId:'han.jh', password:'1234', name:'한지훈', role:'worker', companyId:'comp-001', workerId:'w-002', avatar:'한' },
    { id:'acc-w03', loginId:'cho.hb', password:'1234', name:'조현빈', role:'worker', companyId:'comp-001', workerId:'w-003', avatar:'조' },
    { id:'acc-w04', loginId:'moon.gw', password:'1234', name:'문건우', role:'worker', companyId:'comp-001', workerId:'w-004', avatar:'문' },
    { id:'acc-w05', loginId:'park.yh', password:'1234', name:'박영호', role:'worker', companyId:'comp-001', workerId:'w-005', avatar:'박' },
    { id:'acc-w06', loginId:'lee.sm', password:'1234', name:'이수민', role:'worker', companyId:'comp-001', workerId:'w-006', avatar:'이' },
    { id:'acc-w13', loginId:'song.mj', password:'1234', name:'송민재', role:'worker', companyId:'comp-003', workerId:'w-013', avatar:'송' },
    { id:'acc-w16', loginId:'baek.jw', password:'1234', name:'백정우', role:'worker', companyId:'comp-003', workerId:'w-016', avatar:'백' },
    { id:'acc-w17', loginId:'nam.sh', password:'1234', name:'남승환', role:'worker', companyId:'comp-003', workerId:'w-017', avatar:'남' },
    { id:'acc-w18', loginId:'oh.ys', password:'1234', name:'오영석', role:'worker', companyId:'comp-003', workerId:'w-018', avatar:'오' },
    { id:'acc-w19', loginId:'shin.dk', password:'1234', name:'신동기', role:'worker', companyId:'comp-003', workerId:'w-019', avatar:'신' },
];

const DEFAULT_COMPANIES = [
    { id:'comp-001', name:'퍼스트씨에스', region:'서울/경기', cats:['에어컨','설비'], contact:'02-1234-5678', ceo:'박승현', contractStart:'2024-06-15', contractEnd:'2026-06-14', unitPrice:{'에어컨':180000,'설비':150000}, settleCycle:'월2회(15일,말일)', penalty:50000, status:'active', privacy:{showCustomerName:true, showCustomerPhone:false} },
    { id:'comp-002', name:'주원씨앤아이', region:'서울/경기', cats:['창호','중문'], contact:'02-2345-6789', ceo:'최대표', contractStart:'2024-08-01', contractEnd:'2026-07-31', unitPrice:{'창호':220000,'중문':280000}, settleCycle:'월1회(말일)', penalty:40000, status:'active', privacy:{showCustomerName:true, showCustomerPhone:false} },
    { id:'comp-003', name:'영진테크', region:'수도권', cats:['마루','바닥재'], contact:'031-345-6789', ceo:'김대표', contractStart:'2024-09-01', contractEnd:'2026-08-31', unitPrice:{'마루':120000,'바닥재':95000}, settleCycle:'월2회', penalty:30000, status:'active', privacy:{showCustomerName:true, showCustomerPhone:false} },
    { id:'comp-004', name:'워크사이트', region:'서울/경기', cats:['도배','벽지'], contact:'02-3456-7890', ceo:'정대표', contractStart:'2024-07-01', contractEnd:'2026-06-30', unitPrice:{'도배':80000,'벽지':80000}, settleCycle:'월1회', penalty:30000, status:'active', privacy:{showCustomerName:true, showCustomerPhone:false} },
    { id:'comp-005', name:'그레이프시스템', region:'전국', cats:['에어컨'], contact:'02-4567-8901', ceo:'한대표', contractStart:'2025-01-01', contractEnd:'2026-12-31', unitPrice:{'에어컨':175000}, settleCycle:'월2회', penalty:50000, status:'active', privacy:{showCustomerName:true, showCustomerPhone:false} },
    { id:'comp-006', name:'삼통기업', region:'서울/경기', cats:['마루'], contact:'02-5678-9012', ceo:'오대표', contractStart:'2024-10-01', contractEnd:'2026-09-30', unitPrice:{'마루':110000}, settleCycle:'월1회', penalty:30000, status:'active', privacy:{showCustomerName:true, showCustomerPhone:false} },
    { id:'comp-007', name:'공간씨엔에스', region:'수도권', cats:['마루','타일'], contact:'031-678-9012', ceo:'강대표', contractStart:'2025-02-01', contractEnd:'2027-01-31', unitPrice:{'마루':115000,'타일':130000}, settleCycle:'월1회', penalty:30000, status:'active', privacy:{showCustomerName:true, showCustomerPhone:false} },
    { id:'comp-008', name:'잘하시공', region:'전국', cats:['설비','욕실'], contact:'02-789-0123', ceo:'윤대표', contractStart:'2024-11-01', contractEnd:'2026-10-31', unitPrice:{'설비':145000,'욕실':160000}, settleCycle:'월2회', penalty:40000, status:'active', privacy:{showCustomerName:true, showCustomerPhone:false} },
    { id:'comp-009', name:'도담인테리어', region:'경기', cats:['마루','바닥재'], contact:'031-890-1234', ceo:'배대표', contractStart:'2025-03-01', contractEnd:'2027-02-28', unitPrice:{'마루':115000,'바닥재':90000}, settleCycle:'월1회', penalty:30000, status:'active', privacy:{showCustomerName:true, showCustomerPhone:false} },
    { id:'comp-010', name:'원탑상재', region:'서울', cats:['마루'], contact:'02-901-2345', ceo:'남대표', contractStart:'2025-01-15', contractEnd:'2026-12-31', unitPrice:{'마루':108000}, settleCycle:'월1회', penalty:25000, status:'active', privacy:{showCustomerName:true, showCustomerPhone:false} },
    { id:'comp-011', name:'한빛설비', region:'경기/인천', cats:['설비','철거'], contact:'032-012-3456', ceo:'유대표', contractStart:'2024-12-01', contractEnd:'2026-11-30', unitPrice:{'설비':140000,'철거':100000}, settleCycle:'월1회', penalty:30000, status:'inactive', privacy:{showCustomerName:true, showCustomerPhone:false} },
    { id:'comp-012', name:'세종시공', region:'충청', cats:['타일','욕실'], contact:'044-123-4567', ceo:'고대표', contractStart:'2024-05-15', contractEnd:'2026-05-14', unitPrice:{'타일':125000,'욕실':155000}, settleCycle:'월1회', penalty:25000, status:'active', privacy:{showCustomerName:true, showCustomerPhone:false} },
];

const DEFAULT_WORKERS = [
    { id:'w-001', companyId:'comp-001', name:'김태현', phone:'010-1234-5678', skill:'에어컨/설비', area:'강남/서초/송파', status:'active', certs:[{name:'냉동기능사',no:'NF-2022-1234',expiry:'2027-08-15'}], rating:4.5 },
    { id:'w-002', companyId:'comp-001', name:'한지훈', phone:'010-2345-6789', skill:'에어컨/설비', area:'성남/분당/용인', status:'active', certs:[{name:'냉동기능사',no:'NF-2021-5678',expiry:'2026-04-15'}], rating:4.3 },
    { id:'w-003', companyId:'comp-001', name:'조현빈', phone:'010-3456-7890', skill:'에어컨', area:'서초/반포/방배', status:'active', certs:[{name:'냉동기능사',no:'NF-2023-9012',expiry:'2028-02-20'}], rating:4.4 },
    { id:'w-004', companyId:'comp-001', name:'문건우', phone:'010-4567-8901', skill:'에어컨', area:'송파/잠실/강동', status:'active', certs:[{name:'냉동기능사',no:'NF-2022-3456',expiry:'2027-11-30'}], rating:4.1 },
    { id:'w-005', companyId:'comp-001', name:'박영호', phone:'010-5678-9012', skill:'설비', area:'용인/수지/기흥', status:'active', certs:[{name:'배관기능사',no:'PL-2020-7890',expiry:'2026-04-22'}], rating:3.9 },
    { id:'w-006', companyId:'comp-001', name:'이수민', phone:'010-6789-0123', skill:'에어컨', area:'마포/상암/합정', status:'active', certs:[{name:'냉동기능사',no:'NF-2023-1234',expiry:'2028-06-10'}], rating:4.6 },
    { id:'w-007', companyId:'comp-001', name:'정현우', phone:'010-7890-1234', skill:'에어컨/설비', area:'화성/동탄/오산', status:'active', certs:[{name:'냉동기능사',no:'NF-2022-5678',expiry:'2027-09-05'},{name:'배관기능사',no:'PL-2021-1234',expiry:'2027-03-20'}], rating:4.2 },
    { id:'w-008', companyId:'comp-001', name:'최동혁', phone:'010-8901-2345', skill:'설비', area:'고양/일산/파주', status:'active', certs:[{name:'배관기능사',no:'PL-2019-9012',expiry:'2026-04-22'}], rating:3.8 },
    { id:'w-009', companyId:'comp-001', name:'강민수', phone:'010-9012-3456', skill:'에어컨', area:'관악/신림/구로', status:'active', certs:[{name:'냉동기능사',no:'NF-2023-7890',expiry:'2028-01-15'}], rating:4.3 },
    { id:'w-010', companyId:'comp-001', name:'윤재호', phone:'010-0123-4567', skill:'에어컨', area:'노원/도봉/강북', status:'active', certs:[{name:'냉동기능사',no:'NF-2022-0123',expiry:'2027-07-25'}], rating:4.1 },
    { id:'w-011', companyId:'comp-002', name:'이상훈', phone:'010-1111-2222', skill:'창호', area:'서울 전역', status:'active', certs:[{name:'유리시공기능사',no:'GL-2022-001',expiry:'2027-05-10'}], rating:4.4 },
    { id:'w-012', companyId:'comp-002', name:'김도현', phone:'010-1111-3333', skill:'창호/중문', area:'경기 서부', status:'active', certs:[{name:'유리시공기능사',no:'GL-2021-002',expiry:'2026-08-20'}], rating:4.2 },
    { id:'w-013', companyId:'comp-003', name:'송민재', phone:'010-2222-4444', skill:'마루', area:'강남/서초/송파', status:'active', certs:[{name:'목공기능사',no:'WD-2023-001',expiry:'2028-03-15'}], rating:4.5 },
    { id:'w-016', companyId:'comp-003', name:'백정우', phone:'010-2222-5555', skill:'마루', area:'성남/분당/용인', status:'active', certs:[{name:'목공기능사',no:'WD-2022-045',expiry:'2027-06-20'}], rating:4.3 },
    { id:'w-017', companyId:'comp-003', name:'남승환', phone:'010-2222-6666', skill:'마루/바닥재', area:'고양/일산/파주', status:'active', certs:[{name:'목공기능사',no:'WD-2021-078',expiry:'2026-05-10'}], rating:4.1 },
    { id:'w-018', companyId:'comp-003', name:'오영석', phone:'010-2222-7777', skill:'마루', area:'수원/화성/동탄', status:'active', certs:[{name:'목공기능사',no:'WD-2023-112',expiry:'2028-01-25'}], rating:4.4 },
    { id:'w-019', companyId:'comp-003', name:'신동기', phone:'010-2222-8888', skill:'바닥재', area:'인천/부천', status:'active', certs:[{name:'목공기능사',no:'WD-2020-033',expiry:'2026-04-18'}], rating:3.9 },
    { id:'w-014', companyId:'comp-004', name:'권도윤', phone:'010-3333-5555', skill:'도배', area:'서울/경기', status:'active', certs:[{name:'도배기능사',no:'WL-2022-001',expiry:'2027-09-30'}], rating:4.0 },
    { id:'w-015', companyId:'comp-005', name:'황도현', phone:'010-4444-6666', skill:'에어컨', area:'전국', status:'active', certs:[{name:'냉동기능사',no:'NF-2023-555',expiry:'2028-04-20'}], rating:4.6 },
];

// Jobs generator (same realistic data)
const DEFAULT_JOBS = (() => {
    const jobs = [];
    const p = (b,d,a) => ({before:b,during:d,after:a});
    const addrs = ['서울 강남구 역삼동','서울 서초구 반포동','서울 송파구 잠실동','경기 성남시 분당구','경기 용인시 수지구','서울 마포구 상암동','경기 화성시 동탄','서울 강서구 마곡동','서울 용산구 이태원','경기 고양시 일산','서울 영등포구 여의도','서울 노원구 상계동','인천 남동구 구월동','경기 수원시 영통구','서울 관악구 신림동','서울 강동구 천호동','경기 파주시 운정','서울 종로구 부암동','경기 안양시 동안구','서울 동작구 사당동'];
    const names = ['김OO','이OO','박OO','최OO','정OO','강OO','조OO','윤OO','장OO','임OO','한OO','오OO','서OO','신OO','권OO','황OO','안OO','송OO','류OO','전OO'];
    const types_ac = ['시스템에어컨 설치','벽걸이에어컨 설치','에어컨 이전설치','에어컨 철거','에어컨 점검'];
    const types_pl = ['보일러 교체','배관 교체','보일러 점검','수전 교체','난방배관 시공'];
    let n=0;
    const mkPhone = () => `010-${String(1000+n).slice(-4)}-${String(1000+(n++*7)%9000).slice(-4)}`;
    const rAddr = () => addrs[Math.floor(Math.random()*addrs.length)];
    const rName = () => names[Math.floor(Math.random()*names.length)];
    const workers_001 = ['w-001','w-002','w-003','w-004','w-005','w-006','w-007','w-008','w-009','w-010'];
    const times = ['09:00','09:30','10:00','10:30','11:00','13:00','13:30','14:00','14:30','15:00','15:30','16:00'];
    const workdays = [2,3,4,5,6,9,10,11,12,13,16,17,18,19,20,23,24,25,26,27,30,31];
    let idx=0;
    // comp-001: 72 jobs
    workdays.forEach((day,di) => {
        const dStr=String(day).padStart(2,'0'),cnt=day===31?8:(di%3===0?4:3);
        for(let j=0;j<cnt;j++){
            idx++;const wid=workers_001[(idx-1)%10],isAC=Math.random()>.25,cat=isAC?'에어컨':'설비',type=isAC?types_ac[idx%5]:types_pl[idx%5],time=times[j%12],src=Math.random()>.6?'api':'self';
            let st,sa=null,ca=null,ph=p(0,0,0);
            if(day<31){st='done';sa=`2026-03-${dStr}T${time}:00`;ca=`2026-03-${dStr}T${String(+time.split(':')[0]+2).padStart(2,'0')}:${time.split(':')[1]}:00`;ph=p(2+Math.floor(Math.random()*2),1+Math.floor(Math.random()*2),2+Math.floor(Math.random()*3));}
            else if(j<3){st='done';sa=`2026-03-31T${time}:00`;ca=`2026-03-31T${String(+time.split(':')[0]+2).padStart(2,'0')}:${time.split(':')[1]}:00`;ph=p(2,1,3);}
            else if(j<5){st='progress';sa=`2026-03-31T${time}:00`;ph=p(2,1,0);}
            else{st='waiting';}
            const isAS=day===31&&j===7;
            jobs.push({id:`S-2026-01-${String(idx).padStart(3,'0')}`,companyId:'comp-001',workerId:wid,date:`2026-03-${dStr}`,time,cat,type,addr:rAddr(),customer:rName(),phone:mkPhone(),source:src,extId:src==='api'?`OH-${String(1000+idx)}`:null,status:st,startedAt:sa,completedAt:ca,photos:ph,memo:isAS?'AS: 냉매 부족 의심':'',isAS:isAS||false,...(isAS?{asCode:'AC-01',asIssue:'냉매 부족',origJobId:'S-20260215-034'}:{}),createdAt:`2026-03-${String(Math.max(1,day-3)).padStart(2,'0')}T10:00:00`});
        }
    });
    // comp-003 (영진테크 마루): detailed like comp-001
    const workers_003 = ['w-013','w-016','w-017','w-018','w-019'];
    const types_fl = ['강마루 시공','강화마루 시공','원목마루 시공','마루 부분보수','마루 철거+시공'];
    const types_bd = ['장판 시공','데코타일 시공','비닐타일 시공','바닥재 부분교체'];
    const addrs_fl = ['서울 강남구 대치동','서울 서초구 잠원동','경기 성남시 분당구','경기 용인시 수지구','경기 고양시 덕양구','서울 마포구 연남동','경기 화성시 동탄','서울 송파구 문정동','경기 수원시 팔달구','인천 연수구 송도','서울 강서구 마곡동','서울 관악구 봉천동','경기 파주시 운정','서울 용산구 한남동','서울 노원구 공릉동','경기 안양시 동안구','서울 성동구 성수동','경기 광명시 철산동','서울 종로구 평창동','경기 하남시 미사동'];
    workdays.forEach((day,di) => {
        const dStr=String(day).padStart(2,'0'),cnt=day===31?6:(di%3===0?3:2);
        for(let j=0;j<cnt;j++){
            idx++;const wid=workers_003[(idx-1)%5],isMaru=Math.random()>.2,cat=isMaru?'마루':'바닥재',type=isMaru?types_fl[idx%5]:types_bd[idx%4],time=times[j%12],src=Math.random()>.7?'api':'self';
            let st,sa=null,ca=null,ph=p(0,0,0);
            if(day<31){st='done';sa=`2026-03-${dStr}T${time}:00`;ca=`2026-03-${dStr}T${String(+time.split(':')[0]+3).padStart(2,'0')}:${time.split(':')[1]}:00`;ph=p(2+Math.floor(Math.random()*2),1+Math.floor(Math.random()*2),2+Math.floor(Math.random()*2));}
            else if(j<2){st='done';sa=`2026-03-31T${time}:00`;ca=`2026-03-31T${String(+time.split(':')[0]+3).padStart(2,'0')}:${time.split(':')[1]}:00`;ph=p(2,2,3);}
            else if(j<4){st='progress';sa=`2026-03-31T${time}:00`;ph=p(2,1,0);}
            else{st='waiting';}
            jobs.push({id:`S-2026-03-${String(idx).padStart(3,'0')}`,companyId:'comp-003',workerId:wid,date:`2026-03-${dStr}`,time,cat,type,addr:addrs_fl[idx%20],customer:names[idx%20],phone:mkPhone(),source:src,extId:src==='api'?`OH-FL${idx}`:null,status:st,startedAt:sa,completedAt:ca,photos:ph,memo:'',isAS:false,createdAt:`2026-03-${String(Math.max(1,day-2)).padStart(2,'0')}T10:00:00`});
        }
    });
    // comp-002, comp-004~012: simplified (comp-003 removed from here)
    const others=[['comp-002','w-011','w-012',['창호','중문'],55],['comp-004','w-014',null,['도배','벽지'],38],['comp-005','w-015',null,['에어컨'],35],['comp-006',null,null,['마루'],22],['comp-007',null,null,['마루','타일'],18],['comp-008',null,null,['설비','욕실'],15],['comp-009',null,null,['마루','바닥재'],12],['comp-010',null,null,['마루'],10],['comp-011',null,null,['설비','철거'],8],['comp-012',null,null,['타일','욕실'],6]];
    others.forEach(([cid,w1,w2,cats,cnt])=>{
        for(let i=0;i<cnt;i++){
            const day=workdays[i%workdays.length],dStr=String(day).padStart(2,'0'),isDone=i<Math.round(cnt*.9),cat=cats[i%cats.length];
            idx++;
            jobs.push({id:`S-2026-${cid.slice(-2)}-${String(i+1).padStart(3,'0')}`,companyId:cid,workerId:w1||(i%2===0?w1:w2),date:`2026-03-${dStr}`,time:times[i%6],cat,type:cat+' 시공',addr:rAddr(),customer:rName(),phone:mkPhone(),source:i%3===0?'api':'self',extId:i%3===0?`OH-${cid.slice(-2)}${i}`:null,status:isDone?'done':'waiting',startedAt:isDone?`2026-03-${dStr}T09:00:00`:null,completedAt:isDone?`2026-03-${dStr}T14:00:00`:null,photos:isDone?p(2,1,3):p(0,0,0),memo:'',createdAt:`2026-03-${String(Math.max(1,day-2)).padStart(2,'0')}T10:00:00`});
        }
    });
    return jobs;
})();

const DEFAULT_AS = [
    { id:'AS-0087', companyId:'comp-001', origJobId:'S-2026-01-015', workerId:'w-002', date:'2026-03-25', cat:'에어컨', code:'AC-01', issue:'냉매 부족 재점검', customer:'이OO', phone:'010-9999-0001', status:'open', visitDate:null, resolution:null, createdAt:'2026-03-25T10:00:00' },
    { id:'AS-0086', companyId:'comp-001', origJobId:'S-2026-01-008', workerId:'w-008', date:'2026-03-20', cat:'설비', code:'PL-02', issue:'배관 연결부 미세 누수', customer:'김OO', phone:'010-9999-0002', status:'resolved', visitDate:'2026-03-22', resolution:'조인트 재시공', createdAt:'2026-03-20T14:00:00' },
    { id:'AS-0085', companyId:'comp-001', origJobId:'S-2026-01-003', workerId:'w-005', date:'2026-03-15', cat:'에어컨', code:'AC-04', issue:'리모컨 페어링 불량', customer:'박OO', phone:'010-9999-0003', status:'resolved', visitDate:'2026-03-17', resolution:'리모컨 교체', createdAt:'2026-03-15T09:00:00' },
    { id:'AS-0084', companyId:'comp-002', origJobId:'S-2026-02-012', workerId:'w-011', date:'2026-03-28', cat:'창호', code:'WD-02', issue:'창호 잠금장치 불량', customer:'이OO', phone:'010-9999-0005', status:'open', visitDate:null, resolution:null, createdAt:'2026-03-28T15:00:00' },
    { id:'AS-0083', companyId:'comp-002', origJobId:'S-2026-02-005', workerId:'w-012', date:'2026-03-18', cat:'중문', code:'DR-01', issue:'레일 소음', customer:'김OO', phone:'010-9999-0006', status:'resolved', visitDate:'2026-03-20', resolution:'레일 윤활', createdAt:'2026-03-18T10:00:00' },
    { id:'AS-0082', companyId:'comp-003', origJobId:'S-2026-03-008', workerId:'w-013', date:'2026-03-27', cat:'마루', code:'FL-01', issue:'마루 들뜸', customer:'박OO', phone:'010-9999-0007', status:'open', visitDate:null, resolution:null, createdAt:'2026-03-27T09:00:00' },
    { id:'AS-0081', companyId:'comp-003', origJobId:'S-2026-03-003', workerId:'w-013', date:'2026-03-12', cat:'마루', code:'FL-04', issue:'마루 소음', customer:'조OO', phone:'010-9999-0008', status:'resolved', visitDate:'2026-03-14', resolution:'하부 보강', createdAt:'2026-03-12T11:00:00' },
    { id:'AS-0075', companyId:'comp-003', origJobId:'S-2026-03-015', workerId:'w-016', date:'2026-03-29', cat:'마루', code:'FL-02', issue:'강마루 긁힘 다수', customer:'정OO', phone:'010-9999-0014', status:'open', visitDate:null, resolution:null, createdAt:'2026-03-29T10:00:00' },
    { id:'AS-0074', companyId:'comp-003', origJobId:'S-2026-03-022', workerId:'w-017', date:'2026-03-24', cat:'마루', code:'FL-05', issue:'이음새 벌어짐 3곳', customer:'안OO', phone:'010-9999-0015', status:'in_progress', visitDate:'2026-03-28', resolution:null, createdAt:'2026-03-24T14:00:00' },
    { id:'AS-0073', companyId:'comp-003', origJobId:'S-2026-03-010', workerId:'w-018', date:'2026-03-18', cat:'바닥재', code:'FL-03', issue:'장판 변색', customer:'송OO', phone:'010-9999-0016', status:'resolved', visitDate:'2026-03-20', resolution:'부분 교체', createdAt:'2026-03-18T09:00:00' },
    { id:'AS-0072', companyId:'comp-003', origJobId:'S-2026-03-005', workerId:'w-019', date:'2026-03-15', cat:'마루', code:'FL-01', issue:'원목마루 부풀음', customer:'류OO', phone:'010-9999-0017', status:'resolved', visitDate:'2026-03-17', resolution:'습기차단+재시공', createdAt:'2026-03-15T11:00:00' },
    { id:'AS-0080', companyId:'comp-004', origJobId:'S-2026-04-010', workerId:'w-014', date:'2026-03-26', cat:'도배', code:'WP-01', issue:'벽지 이음새 벌어짐', customer:'최OO', phone:'010-9999-0009', status:'in_progress', visitDate:'2026-03-29', resolution:null, createdAt:'2026-03-26T11:00:00' },
    { id:'AS-0079', companyId:'comp-005', origJobId:'S-2026-05-015', workerId:'w-015', date:'2026-03-22', cat:'에어컨', code:'AC-02', issue:'실외기 소음', customer:'한OO', phone:'010-9999-0010', status:'resolved', visitDate:'2026-03-24', resolution:'방진패드 교체', createdAt:'2026-03-22T14:00:00' },
    { id:'AS-0078', companyId:'comp-006', origJobId:'S-2026-06-005', workerId:null, date:'2026-03-23', cat:'마루', code:'FL-02', issue:'마루 긁힘', customer:'오OO', phone:'010-9999-0011', status:'resolved', visitDate:'2026-03-25', resolution:'부분 보수', createdAt:'2026-03-23T10:00:00' },
    { id:'AS-0077', companyId:'comp-007', origJobId:'S-2026-07-003', workerId:null, date:'2026-03-20', cat:'타일', code:'TL-01', issue:'타일 균열', customer:'강OO', phone:'010-9999-0012', status:'resolved', visitDate:'2026-03-22', resolution:'타일 교체', createdAt:'2026-03-20T16:00:00' },
    { id:'AS-0076', companyId:'comp-011', origJobId:'S-2026-11-002', workerId:null, date:'2026-03-18', cat:'설비', code:'PL-01', issue:'보일러 이상음', customer:'유OO', phone:'010-9999-0013', status:'resolved', visitDate:'2026-03-20', resolution:'팬 모터 교체', createdAt:'2026-03-18T09:00:00' },
];

const DEFAULT_FEEDBACK = [
    { id:'fb-001', jobId:'S-2026-01-001', companyId:'comp-001', workerId:'w-001', rating:4, comment:'깔끔하게 잘 해주셨어요', createdAt:'2026-03-31T11:00:00' },
    { id:'fb-002', jobId:'S-2026-01-002', companyId:'comp-001', workerId:'w-002', rating:5, comment:'친절하고 꼼꼼합니다', createdAt:'2026-03-31T11:30:00' },
    { id:'fb-003', jobId:'S-2026-01-010', companyId:'comp-001', workerId:'w-001', rating:4, comment:'시간 약속 잘 지켜주셨어요', createdAt:'2026-03-30T11:00:00' },
    { id:'fb-004', jobId:'S-2026-01-011', companyId:'comp-001', workerId:'w-002', rating:3, comment:'시공은 괜찮은데 정리가 아쉬워요', createdAt:'2026-03-30T13:00:00' },
    { id:'fb-005', jobId:'S-2026-01-012', companyId:'comp-001', workerId:'w-003', rating:5, comment:'최고입니다!', createdAt:'2026-03-30T12:00:00' },
    { id:'fb-006', jobId:'S-2026-02-001', companyId:'comp-002', workerId:'w-011', rating:4, comment:'잘 해주셨습니다', createdAt:'2026-03-31T13:00:00' },
    { id:'fb-007', jobId:'S-2026-03-001', companyId:'comp-003', workerId:'w-013', rating:5, comment:'마루 시공 너무 만족합니다', createdAt:'2026-03-31T15:00:00' },
    { id:'fb-008', jobId:'S-2026-03-003', companyId:'comp-003', workerId:'w-016', rating:4, comment:'시공은 깔끔한데 소음이 좀 있어요', createdAt:'2026-03-30T10:00:00' },
    { id:'fb-009', jobId:'S-2026-03-005', companyId:'comp-003', workerId:'w-017', rating:5, comment:'바닥이 완전히 달라졌어요', createdAt:'2026-03-29T14:00:00' },
    { id:'fb-010', jobId:'S-2026-03-008', companyId:'comp-003', workerId:'w-018', rating:4, comment:'꼼꼼하게 잘 해주셨습니다', createdAt:'2026-03-28T11:00:00' },
    { id:'fb-011', jobId:'S-2026-03-010', companyId:'comp-003', workerId:'w-013', rating:3, comment:'마감 부분이 조금 아쉬워요', createdAt:'2026-03-27T16:00:00' },
    { id:'fb-012', jobId:'S-2026-03-012', companyId:'comp-003', workerId:'w-019', rating:4, comment:'장판 깔끔하게 깔아주셨어요', createdAt:'2026-03-26T13:00:00' },
];

const DEFAULT_NOTIFICATIONS = [
    { id:'n-001', target:'w-001', type:'schedule', title:'내일 일정 3건', desc:'4월 1일 시공 3건 배정', read:false, createdAt:'2026-03-31T08:00:00' },
    { id:'n-002', target:'w-001', type:'feedback', title:'고객 평가 등록', desc:'이정훈 고객님이 별점 4점', read:false, createdAt:'2026-03-31T11:00:00' },
    { id:'n-003', target:'w-001', type:'as', title:'AS 건 배정', desc:'에어컨 AS 건 배정', read:false, createdAt:'2026-03-31T07:00:00' },
    { id:'n-004', target:'w-002', type:'cert', title:'자격증 만료 임박', desc:'냉동기능사 2026.04.15 만료', read:false, createdAt:'2026-03-30T09:00:00' },
    { id:'n-005', target:'comp-001', type:'alert', title:'자격증 만료 임박 2건', desc:'한지훈(04.15), 최동혁(04.22)', read:false, createdAt:'2026-03-31T08:00:00' },
    { id:'n-006', target:'admin', type:'alert', title:'한빛설비 완료율 저조', desc:'기준치(85%) 미달', read:false, createdAt:'2026-03-31T08:00:00' },
    { id:'n-007', target:'w-013', type:'schedule', title:'내일 일정 2건', desc:'4월 1일 마루 시공 2건 배정', read:false, createdAt:'2026-03-31T08:00:00' },
    { id:'n-008', target:'w-019', type:'cert', title:'자격증 만료 임박', desc:'목공기능사 2026.04.18 만료', read:false, createdAt:'2026-03-31T09:00:00' },
    { id:'n-009', target:'comp-003', type:'as', title:'AS 2건 미처리', desc:'마루 들뜸, 강마루 긁힘 미처리 상태', read:false, createdAt:'2026-03-31T08:30:00' },
    { id:'n-010', target:'w-016', type:'as', title:'AS 건 배정', desc:'강마루 긁힘 AS 배정', read:false, createdAt:'2026-03-29T10:30:00' },
];

// 영진플로링 마루 SKU (공급사코드 9018)
const MARU_SKU = {"구정":[{"n":"구정강(스탠다드)","s":"7.5Tx94x800","c":"강마루","o":["스웨디쉬 화이트","아이보리 화이트","오크 뉴 클래식","오크","코티지 워시","허니티크","티크","아이리쉬 화이트","마일드 그레이 오크","누크 화이트","문라이트 워시","실크 스모키 워시","올란도 화이트","아이보리 워시","스카치 오크","골든 티크"]},{"n":"구정강(프라하)","s":"7.5Tx94x387","c":"강마루","o":["스웨디쉬 화이트","아이보리 화이트","오크 뉴 클래식","오크","코티지 워시","허니티크","티크","아이리쉬 화이트","마일드 그레이 오크","누크 화이트","문라이트 워시","실크 스모키 워시","올란도 화이트","아이보리 워시","스카치 오크","골든 티크"]},{"n":"그랜드 텍스쳐 165","s":"7.5Tx165x1200","c":"강마루","o":["그랜드 스테디 165","그랜드 로그 브라운 165","그랜드 바이즈 티크 165","그랜드 본 오크 165","그랜드 브라이트 오크 165","그랜드 비비드 165","그랜드 스웨디쉬 165","그랜드 러스틱 165","그랜드 애비뉴 165","그랜드 얼바인 165","그랜드 오크 뉴 165","그랜드 헤론 오크 165"]},{"n":"노블레스 14(4)T","s":"14(4)Tx240x2200","c":"원목마루","o":["샌디오크","오크 브러쉬 내츄럴","오크 브러쉬 라이트","화이트 오크"]},{"n":"노블레스(헤링본)","s":"10(3)Tx90x600","c":"원목마루","o":["헤링본 오크"]},{"n":"마뷸러스 듀스","s":"8.7Tx597x1210","c":"강마루","o":["멜로우 베이지","모슬린 화이트","시맨틱 그레이","클라우디 크림","젠틀 라이트","모로칸 브러쉬","솔티 스노우","웜 브라이트"]},{"n":"마뷸러스 리브","s":"7.7Tx393x797","c":"강마루","o":["모로칸 크림","셀럽베이지","스톤그레이","실버문","웜브리즈","젠틀판타지"]},{"n":"마뷸러스 엘","s":"8.7Tx900x900","c":"강마루","o":["모로칸 크림","젠틀 판타지","웜 브리즈","라이트 듄","문 더스트"]},{"n":"마뷸러스 젠","s":"8.7Tx597x597","c":"강마루","o":["젠틀 판타지 (톤업 엣지)","모로칸 크림 (톤업 엣지)","웜 브리즈 (톤업 엣지)","그레이지","뉴트럴 그레이","리저브 스톤","모로칸 크림","무디 블랙","새틴화이트","샌드 테라조","쉐도우 그레이","스톤 그레이","스페이스 그레이","실버 문","웜 브리즈","젠틀 판타지","크림 브륄레","화이트 쇼어"]},{"n":"모던강(스탠다드)","s":"6.5Tx95x800","c":"강마루","o":["모던 베이지 티크","모던 노던 화이트","모던 라이트 그레이 워시","모던 크림","모던 바닐라 크림","모던 아카시아","모던 쉬폰 그레이","모던 오크 워시","모던 오크","모던 티크","모던 블랙"]},{"n":"모던강(프라하)","s":"6.5Tx95x387","c":"강마루","o":["모던 베이지 티크","모던 노던 화이트","모던 라이트 그레이 워시","모던 크림","모던 바닐라 크림","모던 아카시아","모던 쉬폰 그레이","모던 오크 워시","모던 오크","모던 티크","모던 블랙","모던마블화이트"]},{"n":"브러쉬골드","s":"7.5Tx115x900","c":"온돌/브러쉬마루","o":["오크 클래식","애쉬 스모키","애쉬 아몬드","티크 스카치","티크 러스틱"]},{"n":"브러쉬골드(프라하)","s":"7.5Tx115x445","c":"온돌/브러쉬마루","o":["오크 클래식","애쉬 스모키","애쉬 아몬드","티크 스카치","티크 러스틱"]},{"n":"블론테","s":"8.7Tx230x2420","c":"강마루","o":["무어 그레이","헤이즈 오크","본 오크(곧은결)","본 오크(무늬결)","브라이트오크(곧은결)","브라이트오크(무늬결)","엘리엇 오크(무늬결)","엘리엇 오크(곧은결)","어스티 브라운(무늬결)","어스티 브라운(곧은결)"]},{"n":"텍스쳐","s":"7.5Tx115x800","c":"강마루","o":["스모키 화이트","샌드 워시","실버 베이지","럭스 그레이","네이쳐 오크"]},{"n":"파켓 더 헤리티지","s":"10.5(1.2)Tx190x1900","c":"원목마루","o":["화이트 오크","오크","애쉬","브라운 오크","티크"]},{"n":"프레스티지","s":"8.7Tx142x1200","c":"천연마루","o":["화이트 워시 오크","오크","아메리카 오크","SH 오크","애쉬","티크","러스틱 월넛","블랙 오크"]},{"n":"프리미엄 텍스쳐(로얄)","s":"7.5Tx115x800","c":"강마루","o":["샌드 오크","미스티 로즈","블론드 오크","카카오 브라운","카본 블랙"]},{"n":"프리미엄 텍스쳐(와이드)","s":"7.5Tx125x1200","c":"강마루","o":["라일락 화이트","소프트 웨이브","린넨 베이지","딥 라인 오크","모카 브루","골든 브릭"]},{"n":"마뷸러스 뮤즈","s":"7.7Tx393x1200","c":"강마루","o":["모로칸 크림","뮤지엄 그레이","셀럽 베이지","젠틀 판타지"]},{"n":"노블레스 14(3)T","s":"14(3)Tx190x1900","c":"원목마루","o":["리얼 블랙 오크","소프트 애쉬","애쉬 브러쉬 내츄럴","오크 브러쉬 내츄럴"]}],"동화":[{"n":"강 스퀘어 정각","s":"9.5Tx597x597","c":"강마루","o":["이모션블랑","플로쏘 화이트","사하라퓨어","브리즈 펄","몬테 크레마","몬테클라우드","맨하탄 클레이"]},{"n":"강 스퀘어 직각","s":"9.5Tx597x1205","c":"강마루","o":["플로쏘 화이트","사하라퓨어","브리즈 펄","몬테 크레마","몬테클라우드","맨하탄 클레이"]},{"n":"강 오리진","s":"7.5Tx95x800","c":"강마루","o":["리얼 월넛","리얼 티크","브라운 오크","윈디 오크","소프트 그레이","초코 블랙","플랫 화이트","화이트 워시 오크","모던 그레이","오리진 크림","오리진 오크","오리진 브라운"]},{"n":"강 텍스쳐","s":"7.5Tx143x1205","c":"강마루","o":["미스티 화이트","미스티 크리미","슈프림 베이지","슈프림 옐로우","멜란지 베이지","멜란지 그레이","프렌치 오크","프렌치 시에나","스모크 브라운","스모크 블랙"]},{"n":"강 포레","s":"6Tx95x800","c":"강마루","o":["그레이","내추럴","라이트 그레이","딥 브라운","빈티지 카키","화이트 오크","코코아","네이쳐 그레이","네이쳐 오크","네이쳐 애쉬"]},{"n":"강 헤링본","s":"7.5Tx95x475","c":"강마루","o":["브라운 오크","소프트 그레이","플랫 화이트","오리진 오크","초코 블랙"]},{"n":"듀오 스퀘어 정각","s":"10.5Tx595x595","c":"강마루","o":["테살로 화이트","몬테 화이트","콰이엇 웨이브","플로쏘","몬테 그레이","사하라 그레이"]},{"n":"듀오 스퀘어 직각","s":"10.5Tx595x1205","c":"강마루","o":["테살로 화이트","몬테 화이트","콰이엇 웨이브","플로쏘","몬테 그레이","사하라 그레이"]},{"n":"듀오 오리진","s":"7.5Tx115x800","c":"강마루","o":["화이트 워시 오크","리얼 티크","브라운 오크","소프트 그레이","윈드 오크","플랫 화이트","모던 그레이","오리진 크림","오리진 오크"]},{"n":"듀오 텍스쳐","s":"10.5Tx163x1200","c":"강마루","o":["까사 화이트","까사 크레마","까사 탠 오크","까사 내추럴","까사 브라운","옥스포드 크림","옥스포드 그레이","옥스포드 오크","자바 티크","블랙 월넛","모데나 오크","포르토 내추럴"]},{"n":"듀오 텍스쳐 맥스","s":"10.5Tx232x2400","c":"강마루","o":["인텐소 화이트","인텐소 내추럴","돌체 내추럴","돌체 브라운"]},{"n":"바움 165","s":"9Tx165x1200","c":"원목마루","o":["오크 내추럴","오크 넛 베이지","오크 브라운","오크 샌드","오크 엠버","오크 카라멜","오크 토프","티크 내추럴"]},{"n":"바움 190","s":"12Tx190x1900","c":"원목마루","o":["오크 클래식","오크 베이지","오크 브라운","오크 토프"]},{"n":"스톤","s":"8Tx325x800","c":"강화마루","o":["사하라","웨이브"]},{"n":"아이온","s":"7.5Tx163x1207","c":"강화마루","o":["모카","샌드","스노우","클레이","데이지","세피아"]},{"n":"진 그란데","s":"7Tx325x805","c":"강마루","o":["슬레이트 모티프","슬레이트 스틸","레이크 그레이","비안코 화이트","사하라 라이트","솔트 베이지","이모션 블랑","코지 그레이","코지 쉐도우","콰이엇 웨이브","플레인 그레이","화이트 트라버틴"]},{"n":"진 그란데 스퀘어 정각 650","s":"7.5Tx650x650","c":"강마루","o":["포틀랜드 스틸","슬레이트 모티프","슬레이트 스틸","포틀랜드 모티프","몬테 화이트","플로쏘","트라버틴 누보","이모션 블랑","사하라 라이트","몬테 그레이","시티 스톤","테살로 화이트"]},{"n":"진 그란데 스퀘어 직각","s":"7.5Tx650x1220","c":"강마루","o":["슬레이트 스틸","슬레이트 모티프","포틀랜드 모티프","포틀랜드 스틸","몬테 화이트","플로쏘","트라버틴 누보","이모션 블랑","사하라 라이트","몬테 그레이","시티 스톤","테살로 화이트"]},{"n":"진 테라","s":"7.5Tx161x1205","c":"강마루","o":["바닐라","블랙빈","아몬드","오프 화이트","월넛","캐러멜","티크","피치","허니","화이트 드로잉"]},{"n":"진 테라 맥스","s":"7.5Tx195x2040","c":"강마루","o":["화이트","베이지","네추럴","오리진","클레이","브라운"]},{"n":"진 텍스쳐 143","s":"7.5Tx143x1205","c":"강마루","o":["레트로 그레이","레트로 베이지","소울 베이지","소울 시에나","소울 옐로우","실키 크리미","실키 화이트"]},{"n":"진 텍스쳐 161","s":"7.5Tx161x1205","c":"강마루","o":["에덴 화이트","에덴 그레이","에덴 베이지","알토 모카","알토 브라운","알토 내추럴"]},{"n":"진 헤링본","s":"7Tx95x475","c":"강마루","o":["그레이","브라운","시에나","옐로우","화이트"]},{"n":"진 오리진 어반","s":"7Tx98x805","c":"강마루","o":["어반 라떼","어반 밀크티","어반 블랙","어반 샌디에고","어반 카키","어반 화이트"]},{"n":"진 오리진 퓨어","s":"7Tx98x805","c":"강마루","o":["퓨어 그레이","퓨어 베이지","퓨어 브라운","퓨어 샌디","퓨어 시에나","퓨어 실버","퓨어 아이보리","퓨어 옐로우","퓨어 크림"]},{"n":"크로젠","s":"7Tx89x801","c":"강화마루","o":["오크1","오크2","오크3","오크4","오크5","오크6","오크7","월넛"]},{"n":"클릭","s":"8Tx190x1200","c":"강화마루","o":["마호가니","그레이 쏘컷","내추럴 오크","스위트 오크","오크 스트립","워시오크 스트립","체스트넛","히코리"]},{"n":"클릭S","s":"7Tx190x1200","c":"강화마루","o":["파인2","오크3","오크1","애쉬1","메이플","오크5","오크2","오크6","아카시아1","월넛"]},{"n":"진 그란데 스퀘어 정각 805","s":"7.5Tx805x805","c":"강마루","o":["몬테 화이트","플로쏘","트라버틴 누보","이모션 블랑","사하라 라이트","몬테 그레이","시티 스톤","테살로 화이트","슬레이트 모티프","슬레이트 스틸","포틀랜드 모티프","포틀랜드 스틸"]}],"LX지인":[{"n":"강그린 Super","s":"6Tx95x800","c":"강마루","o":["애쉬 코튼","애쉬 소프트","아트 화이트","모노 화이트","앤틱 화이트","애쉬 리얼","모노 그레이","내추럴 오크","내추럴 브라운","애쉬 그레이"]},{"n":"강그린 사각","s":"7.5Tx295x590","c":"강마루","o":["페블라이트","비얀코 마블","솔티스톤","헤이즈마블"]},{"n":"강그린 와이드","s":"7.5Tx125x1200","c":"강마루","o":["로얄 월넛","어니스트오크","푸르티 오크","라임 오크","그릿 애쉬"]},{"n":"강그린 프로","s":"6Tx95x800","c":"강마루","o":["밀크 티","클린 문라이트","골든 필드","허니 엘름","웨트 미스트","바닐라 크림","로우 오크","골든 티크","쉬폰 코튼","로스티드 카카오","페일 다운","브라이트 애프리콧","체리쉬 엘름","머랭 쿠키"]},{"n":"강그린 프로맥스","s":"7Tx165x1200","c":"강마루","o":["우드/에센스내추럴","우드/뮤트 베이지","우드 스페셜/그란데 오크","우드 스페셜/선라이트 애쉬","우드/루트 오크","우드/베이직 오크","우드/울프 그레이"]},{"n":"강화마루 포르테 광폭","s":"8Tx191x1200","c":"강화마루","o":["라임오크","앤틱 오크","오크 오리진","트렌디 오크","캐스크 오크","에센셜오크"]},{"n":"강화마루 포르테 소폭","s":"8Tx90x802","c":"강화마루","o":["라임오크","앤틱 오크","오크 오리진","트렌디 오크","캐스크 오크","에센셜오크"]},{"n":"에디톤","s":"5Tx180x1220","c":"SPC마루","o":["클린 애쉬","유러피안 우드","스모크 오크","쉬폰 오크","밀 그레이","블론드 오크","내추럴 샌드","브리즈 오크","허니 위트","오리지널 티크","새들러 오크","넛츠 브라운"]},{"n":"에디톤 스톤","s":"5Tx450x900","c":"SPC마루","o":["솔티 애쉬","솔티 크림","오닉스 화이트","모데나 라이트","샌드 아이보리","콘크리트 라이트","라임 베이지","프로스트","샌드 그레이","모데나 그레이","콘크리트 그레이","아라베스카토","솔티 브라운","맨하탄 쿼츠","모데나 다크"]},{"n":"에디톤 스톤 600각","s":"5Tx600x600","c":"SPC마루","o":["라임 베이지","솔티 애쉬 스퀘어","솔티 크림 스퀘어","콘크리트 라이트"]}],"한솔":[{"n":"SB마루 강 우드 165","s":"7.5Tx165x1205","c":"강마루","o":["로이드그레이","폴리아오크","밸리내츄럴","데이화이트","로우그레이","데이라이트","데이오크","폴리아라이트","바크브라운","바크딥브라운"]},{"n":"SB마루 강 우드 95","s":"7.5Tx95x800","c":"강마루","o":["피츠화이트","포니화이트","밀러오크","로셀그레이","브라이튼엘름","버트내추럴","카니티크","칼로브라운"]},{"n":"SB마루 강 우드 143","s":"7.5Tx143x1205","c":"강마루","o":["로이드그레이","폴리아오크","밸리내츄럴","윈저화이트","버마티크","하인즈브라운"]},{"n":"SB마루 리얼텍스쳐 와이드","s":"6Tx143x1205","c":"강마루","o":["던화이트오크","던라이트오크","라드그레이","플레이오크","던내츄럴오크","더블티크"]},{"n":"SB마루 리얼텍스쳐 일반","s":"6Tx127x800","c":"강마루","o":["던화이트오크","던라이트오크","라드그레이","플레이오크","던내츄럴오크","더블티크","라이크쏘컷","스노우애쉬","내츄럴쏘컷","라드애쉬","페인티드베이지","페인티드핑크","페인티드그레이","페인티드블루","페인티드애쉬","페인티드블랙","더블딥브라운"]},{"n":"SB마루 스톤395","s":"7.5Tx395x795","c":"강마루","o":["베일그레이","팬텀클레이","트라버틴밀크","셀바스톤차콜","베일라이트","무이네화이트","무이네그레이","비체아이보리","마테라베이지","칼라카타","화이트에보라","라이트트라버틴","그라니텔로그레이","사멧그레이","비체그레이","루나크림","무이네라이트","루트샌드라이트"]},{"n":"SB마루 스톤600","s":"7.5Tx600x1200","c":"강마루","o":["무이네화이트","무이네그레이","비체아이보리","마테라베이지"]},{"n":"SB스톤 스퀘어800","s":"7.5Tx800x800","c":"강마루","o":["팬텀클레이","베일그레이","베일라이트","셀바스톤차콜","트라버틴밀크","무이네화이트","무이네그레이","마테라베이지","비체아이보리"]},{"n":"강화마루 스톤390","s":"8Tx390x1200","c":"강화마루","o":["밀스톤","몬테카라라"]},{"n":"강화마루 우드100","s":"8Tx100x800","c":"강화마루","o":["파우더화이트","글렌오크","오트밀오크","브릭오크","베이직그레이","브론즈티크","토레스자토바","카운티월넛"]},{"n":"강화마루 우드190","s":"8Tx190x1200","c":"강화마루","o":["코지화이트","화이트파인3","하버그레이","모튼엘름","프로방스오크","멜로우오크","스프렌더오크","스탠다드오크2","스프링오크2","원터그레이오크","겐트멀바우","에스프레소월넛"]},{"n":"울트라 일반","s":"7.5Tx95x800","c":"강마루","o":["슈가화이트","린넨화이트","화이트워시오크","미니멀엘름","워시오크3","리치그레이","네이쳐오크","모리스오크","로얄티크","바고티크"]},{"n":"콜렉트 스킨플로어","s":"7.5Tx190x1700","c":"강마루","o":["앤그레이","몬세라트월넛","베르겐오크","조슈아내추럴","조슈아베이지","허스트메이플","온타리오화이트","조슈아라이트","앤내추럴","포파티크"]},{"n":"펫마루 마블","s":"6Tx390x790","c":"펫마루","o":["밀크카라라","쏠티쥬메라"]},{"n":"펫마루 우드","s":"6Tx143x1205","c":"펫마루","o":["코코넛엘름","카라멜오크","베이크오크","초콜렛오크","헤이즐넛티크"]},{"n":"울트라 와이드 165","s":"7.5Tx165x1205","c":"강마루","o":["뉴트럴워시오크","딤그레이오크","보르도오크","프레즈노월넛","내추럴쏘컷","던내추럴오크","던화이트오크","라이트쏘컷","페인티드애쉬","플레이오크"]},{"n":"SB스톤 스퀘어600","s":"7.5Tx600x600","c":"강마루","o":["마테라베이지","무이네그레이","무이네라이트","무이네화이트"]}],"올고다":[{"n":"로카","s":"7Tx398x800","c":"강마루","o":["도브 화이트","데저트 로제","인디언 크림","바티칸 화이트","루나 그레이","시에나 크림","퓨어 마블","골드 코스트","페블 그레이","스페이스 마블","세인트 베이지","린넨 그레이","아르망 화이트"]},{"n":"로카 프리미엄","s":"7Tx600x1205","c":"강마루","o":["도브 화이트","인디언 크림","바티칸 화이트","루나 그레이","시에나 크림","세인트 베이지","린넨 그레이","아르망 화이트"]},{"n":"모던라이트","s":"7Tx398x800","c":"강마루","o":["클라우드 화이트","클라우드 베이지"]},{"n":"모던라이트 프리미엄","s":"7Tx600x1205","c":"강마루","o":["클라우드 화이트","클라우드 베이지"]},{"n":"밸런스","s":"6.5Tx95x800","c":"강마루","o":["세인트 캐시미어","포슬린 클라우드","맨하탄 아이보리","스칼렛 화이트","뉴트럴 베이지","크레마 베이지","골든 스케치","러스티 브라운","마호가니 티크","오닉스","레트로 그레이","레트로 브라운","체르니 오크","스노우 오크"]},{"n":"벤티움","s":"10Tx190x1900","c":"강마루","o":["아이보리 오크","크라운 오크","와일드 오크","그랜드 티크","잉글리쉬 월넛"]},{"n":"어센티크","s":"7Tx165x1205","c":"강마루","o":["오크 크림","오크 베이지","오크 브라운"]},{"n":"오브제","s":"7Tx165x1205","c":"강마루","o":["오슬로 화이트","런던 화이트","보르도 화이트","프렌치 버터","라틴 오크","네이처 오크","헤더 베이지","브랜디 오크","마론 브라운","세피아 오크"]},{"n":"로카 스퀘어","s":"7Tx600x600","c":"강마루","o":["시에나 크림","루나 그레이","도브 화이트","세인트 베이지","린넨 그레이","아르망 화이트"]}],"풍산":[{"n":"모네","s":"7.5Tx95x800","c":"강마루","o":["러셀브라운","르네 브라운","몰튼 그레이","에머슨 오크","알펜 화이트","화이트 골드","소프트 오크","라이트 워시","어반 그레이","헤리티지 오크","로얄 오크","미얀마 티크","빈티지 블랙"]},{"n":"모네 듀플","s":"7.7Tx600x1205","c":"강마루","o":["헤일로크림","루나베일","스노우터치","코튼베이지"]},{"n":"모네 로키","s":"7.7Tx398x800","c":"강마루","o":["루나베일","헤일로크림","스노우터치","코튼베이지","샌드블로우","파우더리"]},{"n":"모네 시그니처","s":"7.5Tx142x1205","c":"강마루","o":["하만 오크","화이트 밀로","밀로 브라운","그레이 어스","보타닉 브라운","고든 그레이","원 오크","아르테","원 브라운"]},{"n":"모네 텍스쳐 2","s":"6.5Tx115x800","c":"강마루","o":["오크 트리","릴리 화이트","인더 그레이","카멜 브라운","화이트 트리","오크 멜로우","오크 바이브","카멜 티크","커스텀 월넛"]},{"n":"모네 프리머스 2","s":"7.5Tx165x1205","c":"강마루","o":["화이트 로사","터너 클래시","틸 그레이","테이트 브라운","오크 바젤"]},{"n":"모네 큐브","s":"7.7Tx597x597","c":"강마루","o":["헤일로크림","스노우터치","코튼베이지","루나베일"]}],"노바":[{"n":"ACRO-K 시리즈","s":"15(3)Tx190x1900","c":"원목마루","o":["오리엔테","헤스티아","돌체비타","데일트리","데메테르","크로노스","비스코티","헤이즐넛","메리골드"]},{"n":"B 시리즈","s":"10(2)Tx150x1200","c":"원목마루","o":["내추럴오크","코튼오크","르메르브라운","앤티크브론즈","소컷내추럴오크","소컷비치샌드","소컷브라운리버"]},{"n":"M 시리즈","s":"10(2)Tx160x480","c":"원목마루","o":["내추럴오크","프렌치블랙","샌드브라운","브라운토치"]},{"n":"ST 시리즈","s":"9.2(1.2)Tx125x900","c":"원목마루","o":["내추럴오크","화이트워시오크-N","카키브라운","버건디로즈","애쉬내추럴","애쉬L.브라운","애쉬그레이","언더포레스트","젠틀브라운","코지다크"]},{"n":"ST-K 시리즈","s":"11(1)Tx190x1900","c":"원목마루","o":["다즐링","타히티","에그쉘","가이아","제스티","나르시","테라피","시에나","리버티"]},{"n":"VISTA-B 시리즈","s":"9Tx150x1200","c":"원목마루","o":["아론","베이","글렌","베간","재키","범블","로띠","토피"]},{"n":"W 시리즈","s":"10(2)Tx125x900","c":"원목마루","o":["내추럴오크","티크","샌드브라운","소프트그레이","빈티지오크","스노우베이지","프렌치블랙","월넛","워시오크","멀바우","브라운오크","물랑루즈","차콜그레이"]},{"n":"강마루","s":"7.5Tx95x800","c":"강마루","o":["내추럴티크","메이플","신브라운오크","블랙오크","오크내추럴","워시오크","마일드오크","화이트오크","화이트워시오크","그레이워시오크","시에라샌드","시에라블랙","시에라클라우드","토프그레이"]},{"n":"노블강마루","s":"6.5Tx95x800","c":"강마루","o":["리얼오크","리얼애쉬","리얼티크","마인워시","마인미스트","마인스웨이드","리얼시티","리얼카카오","리얼블랙"]},{"n":"뉴트로","s":"7.5Tx115x800","c":"강마루","o":["세레나데오크","루지아오크","홀리데이오크","리즈브라운","루시월넛","피오브라운","리버그레이","오트브라운","스카치","아테네오크","덴버오크","비비안애쉬","모스카토그레이","화이트그레이","크림"]},{"n":"블랙라벨","s":"7.5Tx165x1200","c":"강마루","o":["벨라","블랑","남산","솔티","스완","포니애쉬","블루밍오크","그레이스","미스틱","스노우","뮤트","네바다","클래시월넛","헤이즐티크","헬렌티크","누아르"]},{"n":"테라스","s":"7.5Tx395x790","c":"강마루","o":["아보리샌즈","아로하베이지","베이비블룸","마블로단테","데이지모션","델피늄그레이","릴리안포츠","헤글리토스","플라야스폿"]},{"n":"테라스 스퀘어","s":"8Tx597x597","c":"강마루","o":["아보리샌즈","아로하베이지","베이비블룸","릴리안포츠","데이지모션","마티에르","베나토","토스카나","아라베스크","이스타리아"]},{"n":"플로","s":"7.5Tx190x1600","c":"강마루","o":["시그니처오크","멜로우오크","애프터눈오크","테디브라운오크","플럼브라운","코코월넛","샬롯그레이","듀이브라운","쉐이드"]},{"n":"포근","s":"7.5Tx165x1200","c":"강마루","o":["글라이드","나잇포그","오드페일","유세이지","프릴리아"]}],"디앤메종":[{"n":"12T","s":"12(2)Tx190x1900","c":"원목마루","o":["오크AB (1.2mm)","프로젠","솔트","올드루이스","오크블랙","스모키화이트","골든팔레스","아리아","건스톡","보스코","올드엘라","티크브러쉬","몬트로즈","애쉬화이트","오크AB","오크ABC","오크ABCD"]},{"n":"14T(180)","s":"14(3)Tx180x1900","c":"원목마루","o":["스모크드오크","스모크퍼쉘","세인트리","그레이스톤","윈저","몬트로즈","벤트리벨포트","오크ABCD"]},{"n":"14T(190)","s":"14(3)Tx190x1900","c":"원목마루","o":["오크AB (2+1)","오크AB","프리미엄 오크(AB)","오크ABC","오크ABCD","카리브"]},{"n":"14T(240)","s":"14(3)Tx240x2200","c":"원목마루","o":["화이트오크 (1.2mm)"]},{"n":"그레이스2.5","s":"7.5Tx115x800","c":"강마루","o":["오크레지나","레지나크롭","레지나화이트","보자르","애쉬내추럴","티크빅","미콜라","텐더오크","몬트로즈"]},{"n":"디앤스퀘어","s":"7.5Tx597x597","c":"강마루","o":["포르토화이트","포르토베이지","그리지오","카세로마블","로렌화이트","로렌그레이"]},{"n":"디앤스톤295","s":"7.5Tx295x595","c":"강마루","o":["포르토화이트","포르토베이지","그리지오","카세로마블","로렌화이트","로렌그레이"]},{"n":"디앤스톤395","s":"7.5Tx395x800","c":"강마루","o":["포르토화이트","포르토베이지","그리지오","카세로마블","로렌화이트","로렌그레이"]},{"n":"마제스티 내추럴","s":"7.5Tx230x2000","c":"강마루","o":["오크_RG","RG라이트","브릭톤","클라우디","쉐이커 그레이","네이쳐","비앙키","로체오크","스모크오크","로버오크","크로마오크"]},{"n":"마제스티 아트","s":"7.5Tx230x2000","c":"강마루","o":["AM-브라운","AM-글렌","오크-AM","바롤로","가야","리코","믹싱불","워싱레이","쇼커","플러쉬"]},{"n":"빅3.0","s":"7.5Tx125x1203","c":"강마루","o":["오크AM","믹싱불","가야","리코","바롤로","AM글랜","AM브라운","워싱레이","쇼커","플러쉬"]},{"n":"식스팩 빅","s":"6Tx145x1203","c":"강마루","o":["티크G","코디치그레이","코디치화이트","쉐넌화이트","아르코","빌라드오크","메를로","오크6"]},{"n":"식스팩3.5","s":"6Tx95x800","c":"강마루","o":["티크G","코디치그레이","코디치화이트","쉐넌화이트","아르코","빌라드오크","메를로","오크6"]},{"n":"와이드빅","s":"7.5Tx165x1203","c":"강마루","o":["와이드 아르모니아","와이드 애쉬화이트","와이드 오크레지나","와이드 텐더오크","와이드 오크빅","와이드 티크G","와이드 로렌스","와이드 미콜라","와이드 몬트로즈"]},{"n":"텍스쳐","s":"7.5Tx115x800","c":"강마루","o":["K2브러쉬","그레이시크","다크윈체스터","베이지브러쉬","블랙브러쉬","오크브러쉬","윈체스터브러쉬","콘실크브러쉬","크림브러쉬"]},{"n":"텍스쳐 와이드","s":"7.5Tx165x1203","c":"강마루","o":["오크RG","RG라이트","클라우디","쉐이커그레이","네이쳐","로체오크","로버오크","스모크오크","크로마오크"]},{"n":"텍스쳐2.5","s":"7.5Tx115x800","c":"강마루","o":["오크RG","RG라이트","클라우디","쉐이커그레이","네이쳐","로체오크","로버오크","스모크오크","크로마오크"]},{"n":"텐우드","s":"10(0.6)Tx165x1203","c":"원목마루","o":["아리아","애쉬10","오크10","티크10","고스트화이트","미스티","페일","월넛","시에나","버프","로지"]}]};

const AS_CODES = {
    '에어컨':[{code:'AC-01',name:'냉매 부족/누출'},{code:'AC-02',name:'실외기 소음'},{code:'AC-03',name:'배수 불량'},{code:'AC-04',name:'리모컨/통신 불량'},{code:'AC-05',name:'냉방 성능 저하'}],
    '설비':[{code:'PL-01',name:'보일러 이상음'},{code:'PL-02',name:'배관 누수'},{code:'PL-03',name:'온수 온도 이상'},{code:'PL-04',name:'난방 불균형'},{code:'PL-05',name:'수전 누수'}],
    '마루':[{code:'FL-01',name:'들뜸/부풀음'},{code:'FL-02',name:'긁힘/찍힘'},{code:'FL-03',name:'변색/얼룩'},{code:'FL-04',name:'소음(삐걱)'},{code:'FL-05',name:'이음새 벌어짐'}],
    '창호':[{code:'WD-01',name:'결로 발생'},{code:'WD-02',name:'잠금장치 불량'},{code:'WD-03',name:'기밀 불량'},{code:'WD-04',name:'유리 파손'},{code:'WD-05',name:'힌지 이상'}],
    '도배':[{code:'WP-01',name:'이음새 벌어짐'},{code:'WP-02',name:'기포 발생'},{code:'WP-03',name:'곰팡이'},{code:'WP-04',name:'탈색/변색'}],
    '벽지':[{code:'WP-01',name:'이음새 벌어짐'},{code:'WP-02',name:'기포 발생'},{code:'WP-03',name:'곰팡이'},{code:'WP-04',name:'탈색/변색'}],
    '타일':[{code:'TL-01',name:'균열/깨짐'},{code:'TL-02',name:'탈락'},{code:'TL-03',name:'줄눈 불량'},{code:'TL-04',name:'들뜸'}],
    '욕실':[{code:'BT-01',name:'수전 누수'},{code:'BT-02',name:'배수 불량'},{code:'BT-03',name:'변기 이상'},{code:'BT-04',name:'타일 균열'}],
    '중문':[{code:'DR-01',name:'레일 소음'},{code:'DR-02',name:'잠금 불량'},{code:'DR-03',name:'유리 파손'},{code:'DR-04',name:'처짐'}],
    '바닥재':[{code:'FL-01',name:'들뜸'},{code:'FL-02',name:'긁힘'},{code:'FL-03',name:'변색'},{code:'FL-04',name:'소음'}],
    '철거':[{code:'DM-01',name:'잔재물 미처리'},{code:'DM-02',name:'주변 손상'}],
};

const HELPERS = {
    formatDate(d) { if(!d)return'—';const dt=new Date(d);return`${String(dt.getMonth()+1).padStart(2,'0')}.${String(dt.getDate()).padStart(2,'0')}`; },
    formatDateTime(d) { if(!d)return'—';const dt=new Date(d);return`${this.formatDate(d)} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`; },
    certStatus(exp) { const now=new Date(),e=new Date(exp),d=Math.floor((e-now)/(86400000));if(d<0)return{cls:'cert-expired',icon:'🚨',text:'만료',days:d};if(d<30)return{cls:'cert-danger',icon:'🚨',text:`D-${d}`,days:d};if(d<60)return{cls:'cert-warn',icon:'⚠️',text:`D-${d}`,days:d};return{cls:'cert-ok',icon:'✅',text:exp.substring(0,10),days:d}; },
    rateClass(r) { return r>=88?'up':r>=85?'':'down'; },
    asRateClass(r) { return r<=3?'up':r<=5?'warn':'down'; },
    starsHtml(r,sz) { sz=sz||'12px';const f=Math.round(r);return`<span class="stars" style="font-size:${sz}">${'★'.repeat(f)}<span class="empty">${'★'.repeat(5-f)}</span></span>`; },
    companyStats(cid) {
        const jobs=DB.getAll('jobs').filter(j=>j.companyId===cid),m=jobs.filter(j=>j.date?.startsWith('2026-03')),d=m.filter(j=>j.status==='done');
        const as=DB.getAll('asTickets').filter(a=>a.companyId===cid&&a.date?.startsWith('2026-03'));
        const ws=DB.getAll('workers').filter(w=>w.companyId===cid);
        const fb=DB.getAll('feedback').filter(f=>f.companyId===cid);
        const avg=fb.length?(fb.reduce((s,f)=>s+f.rating,0)/fb.length).toFixed(1):'—';
        return{workerCount:ws.length,monthlyJobs:m.length,monthlyDone:d.length,rate:m.length?Math.round(d.length/m.length*1000)/10:0,asOpen:as.filter(a=>a.status==='open').length,asTotal:as.length,asRate:m.length?Math.round(as.length/m.length*1000)/10:0,avgRating:avg};
    },
    totalStats() {
        const jobs=DB.getAll('jobs'),m=jobs.filter(j=>j.date?.startsWith('2026-03')),d=m.filter(j=>j.status==='done');
        const ws=DB.getAll('workers'),cs=DB.getAll('companies');
        const as=DB.getAll('asTickets').filter(a=>a.date?.startsWith('2026-03'));
        return{companyCount:cs.length,activeCompanies:cs.filter(c=>c.status==='active').length,workerCount:ws.length,monthlyJobs:m.length,monthlyDone:d.length,rate:m.length?Math.round(d.length/m.length*1000)/10:0,selfCount:m.filter(j=>j.source==='self').length,apiCount:m.filter(j=>j.source==='api').length,asOpen:as.filter(a=>a.status==='open').length,asTotal:as.length};
    },
    workerStats(wid) {
        const jobs=DB.getAll('jobs').filter(j=>j.workerId===wid&&j.date?.startsWith('2026-03')),d=jobs.filter(j=>j.status==='done');
        const as=DB.getAll('asTickets').filter(a=>a.workerId===wid&&a.date?.startsWith('2026-03'));
        const fb=DB.getAll('feedback').filter(f=>f.workerId===wid);
        const avg=fb.length?(fb.reduce((s,f)=>s+f.rating,0)/fb.length).toFixed(1):'—';
        return{monthlyJobs:jobs.length,monthlyDone:d.length,rate:jobs.length?Math.round(d.length/jobs.length*1000)/10:0,asCount:as.length,avgRating:avg};
    }
};
