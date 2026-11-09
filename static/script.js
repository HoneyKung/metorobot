//นิยามบล็อก
Blockly.Blocks['move_forward'] = {
    init: function () {
        this.appendDummyInput()
            .appendField("forward");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setStyle('movement_blocks');
        this.setTooltip("");
        this.setHelpUrl("");
    }
};
Blockly.Blocks['move_backward'] = {
    init: function () {
        this.appendDummyInput()
            .appendField("backward");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setStyle('movement_blocks');
        this.setTooltip("");
        this.setHelpUrl("");
    }
};

//บล็อกเลี้ยวซ้าย
Blockly.Blocks['turn_left'] = {
    init: function () {
        this.appendDummyInput()
            .appendField("left");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setStyle('movement_blocks');
        this.setTooltip("");
        this.setHelpUrl("");
    }
};

//บล็อกเลี้ยวขวา
Blockly.Blocks['turn_right'] = {
    init: function () {
        this.appendDummyInput()
            .appendField("right");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setStyle('movement_blocks');
        this.setTooltip("");
        this.setHelpUrl("");
    }
};

Blockly.Blocks['wait_one_sec'] = {
    init: function () {
        this.appendDummyInput()
            .appendField("delay 1 sec");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setStyle('loop_blocks');
        this.setTooltip("delay 1 sec");
    }
};

// Block: Delay
Blockly.Blocks['delay_sec'] = {
    init: function () {
        this.appendValueInput("SEC")
            .setCheck("Number")
            .appendField("Wait");
        this.appendDummyInput()
            .appendField("seconds");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        // เดิม setColour(120) = เขียว ซึ่งเป็นสีหมวด Operator ทั้งที่อยู่หมวด Control
        this.setStyle('loop_blocks');
        this.setTooltip("รอเป็นวินาที (จำนวนเต็ม) · อยากรอละเอียดกว่านี้ใช้ wait … ms");
        this.setHelpUrl("");
    }
};

// ไอคอนสามเหลี่ยม play สีขาว — ฝังเป็น data-URI ไม่ต้องโหลดจากเน็ต
var PLAY_ICON_SVG = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ffffff">' +
    '<path d="M7 4.5v15l13-7.5z"/></svg>');

// Block: Start Program (Hat Block)
Blockly.Blocks['start_program'] = {
    init: function () {
        this.appendDummyInput()
            .appendField("START PROGRAM")
            // ไอคอน play เป็น data-URI SVG ในตัว
            // เดิมดึงจาก img.icons8.com ซึ่งขัดกับเจตนาที่เขียนไว้ใน index.html เองว่า
            // "ไม่พึ่ง CDN/อินเทอร์เน็ต เหมาะกับห้องที่เน็ตไม่เสถียร"
            // ห้องที่เน็ตล่ม ไอคอนบนบล็อกที่สำคัญที่สุดจะแตก
            .appendField(new Blockly.FieldImage(PLAY_ICON_SVG, 15, 15, "*"));
        this.setNextStatement(true, null);
        this.setColour(20); // Control/Event color (Orange-ish)
        this.setTooltip("Run the code attached to this block");
        this.setHelpUrl("");
        this.setStyle('hat_blocks'); // Optional: Requires theme support for correct hat shape, but setColour works effectively
    }
};

//Left Arm Control
Blockly.Blocks['arm_left_close'] = {
    init: function () {
        this.appendDummyInput().appendField("Left Arm: Up (R)");
        this.setTooltip("ยกแขนซ้ายขึ้น (คำสั่ง r)");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setStyle('arm_blocks');
    }
};
Blockly.Blocks['arm_left_normal'] = {
    init: function () {
        this.appendDummyInput().appendField("Left Arm: Middle (F)");
        this.setTooltip("แขนซ้ายกลับระดับกลาง (คำสั่ง f)");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setStyle('arm_blocks');
    }
};
Blockly.Blocks['arm_left_open'] = {
    init: function () {
        this.appendDummyInput().appendField("Left Arm: Down (V)");
        this.setTooltip("ลดแขนซ้ายลง (คำสั่ง v)");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setStyle('arm_blocks');
    }
};

//Right Arm Control
Blockly.Blocks['arm_right_close'] = {
    init: function () {
        this.appendDummyInput().appendField("Right Arm: Up (T)");
        this.setTooltip("ยกแขนขวาขึ้น (คำสั่ง t)");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setStyle('arm_blocks');
    }
};
Blockly.Blocks['arm_right_normal'] = {
    init: function () {
        this.appendDummyInput().appendField("Right Arm: Middle (G)");
        this.setTooltip("แขนขวากลับระดับกลาง (คำสั่ง g)");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setStyle('arm_blocks');
    }
};
Blockly.Blocks['arm_right_open'] = {
    init: function () {
        this.appendDummyInput().appendField("Right Arm: Down (B)");
        this.setTooltip("ลดแขนขวาลง (คำสั่ง b)");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setStyle('arm_blocks');
    }
};

// มือหนีบ (เฟิร์มแวร์ 6 พ.ย.): คำสั่ง 1/2/3 = มือขวา (CH3) กาง/กลาง/หนีบ · 4/5/6 = มือซ้าย (CH1) หนีบ/กลาง/กาง
// ชื่อชนิดบล็อก (hand_left_* / hand_right_*) ต้องคงไว้ ไม่งั้นโปรเจกต์ที่เซฟไว้จะโหลดไม่ขึ้น
// แต่ข้อความบนบล็อกบอกข้างและท่าตามที่หุ่นทำจริง (เดิมเขียน Down/Center/Up และข้างสลับกัน)
Blockly.Blocks['hand_left_down'] = {
    init: function () {
        this.appendDummyInput().appendField("Right Hand: กาง (1)");
        this.setTooltip("มือขวากางออกสุด (คำสั่ง 1)");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setStyle('hand_blocks');
    }
};
Blockly.Blocks['hand_left_center'] = {
    init: function () {
        this.appendDummyInput().appendField("Right Hand: กลาง (2)");
        this.setTooltip("มือขวาอยู่ตำแหน่งกลาง (คำสั่ง 2)");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setStyle('hand_blocks');
    }
};
Blockly.Blocks['hand_left_up'] = {
    init: function () {
        this.appendDummyInput().appendField("Right Hand: หนีบ (3)");
        this.setTooltip("มือขวาหนีบสุด (คำสั่ง 3)");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setStyle('hand_blocks');
    }
};

//Right Hand
Blockly.Blocks['hand_right_down'] = {
    init: function () {
        this.appendDummyInput().appendField("Left Hand: หนีบ (4)");
        this.setTooltip("มือซ้ายหนีบสุด (คำสั่ง 4)");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setStyle('hand_blocks');
    }
};
Blockly.Blocks['hand_right_center'] = {
    init: function () {
        this.appendDummyInput().appendField("Left Hand: กลาง (5)");
        this.setTooltip("มือซ้ายอยู่ตำแหน่งกลาง (คำสั่ง 5)");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setStyle('hand_blocks');
    }
};
Blockly.Blocks['hand_right_up'] = {
    init: function () {
        this.appendDummyInput().appendField("Left Hand: กาง (6)");
        this.setTooltip("มือซ้ายกางออกสุด (คำสั่ง 6)");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setStyle('hand_blocks');
    }
};

//Head Control
Blockly.Blocks['head_turn_right'] = {
    init: function () {
        this.appendDummyInput().appendField("Head: Turn Right (7)");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setStyle('head_blocks');
    }
};

Blockly.Blocks['head_center'] = {
    init: function () {
        this.appendDummyInput().appendField("Head: Center (8)");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setStyle('head_blocks');
    }
};

Blockly.Blocks['head_turn_left'] = {
    init: function () {
        this.appendDummyInput().appendField("Head: Turn Left (9)");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setStyle('head_blocks');
    }
};

// Face (Emotion) Blocks
Blockly.Blocks['face_normal'] = {
    init: function () {
        this.appendDummyInput().appendField("Face: Normal");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setStyle('face_blocks');
    }
};
Blockly.Blocks['face_look_left'] = {
    init: function () {
        this.appendDummyInput().appendField("Face: Look Left");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setStyle('face_blocks');
    }
};
Blockly.Blocks['face_look_right'] = {
    init: function () {
        this.appendDummyInput().appendField("Face: Look Right");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setStyle('face_blocks');
    }
};
Blockly.Blocks['face_happy'] = {
    init: function () {
        this.appendDummyInput().appendField("Face: Happy");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setStyle('face_blocks');
    }
};
Blockly.Blocks['face_sad'] = {
    init: function () {
        this.appendDummyInput().appendField("Face: Sad");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setStyle('face_blocks');
    }
};
Blockly.Blocks['face_angry'] = {
    init: function () {
        this.appendDummyInput().appendField("Face: Angry");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setStyle('face_blocks');
    }
};
Blockly.Blocks['face_shocked'] = {
    init: function () {
        this.appendDummyInput().appendField("Face: Shocked");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setStyle('face_blocks');
    }
};
Blockly.Blocks['face_sleepy'] = {
    init: function () {
        this.appendDummyInput().appendField("Face: Sleepy");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setStyle('face_blocks');
    }
};
Blockly.Blocks['face_confused'] = {
    init: function () {
        this.appendDummyInput().appendField("Face: Confused");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setStyle('face_blocks');
    }
};
Blockly.Blocks['face_love'] = {
    init: function () {
        this.appendDummyInput().appendField("Face: Love");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setStyle('face_blocks');
    }
};
Blockly.Blocks['face_shy'] = {
    init: function () {
        this.appendDummyInput().appendField("Face: Shy");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setStyle('face_blocks');
    }
};

// Gripper Blocks
Blockly.Blocks['grip_smart'] = {
    init: function () {
        this.appendDummyInput().appendField("Grip: Smart Grab");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setStyle('gripper_blocks');
        this.setTooltip("ค่อยๆ หนีบจับของอัตโนมัติ");
    }
};
Blockly.Blocks['grip_release'] = {
    init: function () {
        this.appendDummyInput().appendField("Grip: Release");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setStyle('gripper_blocks');
        this.setTooltip("ปล่อยของ เปิดแขนออก");
    }
};
Blockly.Blocks['grip_verify'] = {
    init: function () {
        this.appendDummyInput().appendField("Grip: Grab & Lift");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setStyle('gripper_blocks');
        this.setTooltip("จับของ → ยกขึ้น → เช็คว่าจับได้");
    }
};
Blockly.Blocks['grip_percent'] = {
    init: function () {
        this.appendValueInput("PCT")
            .setCheck("Number")
            .appendField("Grip:");
        this.appendDummyInput()
            .appendField("%");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setStyle('gripper_blocks');
        this.setTooltip("หนีบที่เปอร์เซ็นต์ที่กำหนด (0=เปิด, 100=หนีบสุด)");
    }
};


// ==================== บล็อกคำสั่งใหม่ (เฟิร์มแวร์ 6 พ.ย. 2569) ====================
// ตารางคำสั่ง: Robo/Part Robot/งานโค้ด_2026-11/รายงานเฟิร์มแวร์_วันศุกร์.md หัวข้อ 2
// ช่องตัวเลขใช้ "บล็อกตัวเลขมีช่วง" เป็น shadow — พิมพ์เกินช่วงไม่ได้ตั้งแต่ในช่อง
// ถ้าเด็กเอาตัวแปร/สูตรมาเสียบแทน ค่าจะถูกบีบให้อยู่ในช่วงอีกชั้นตอนสร้างคำสั่ง (METO_CMD)

// ช่วงค่าของแต่ละคำสั่ง — ต้องตรงกับตารางในรายงานเฟิร์มแวร์
var METO_RANGE = {
    num_yaw: [-90, 90],      // yaw:
    num_tilt: [-10, 10],     // tilt:
    num_lift: [-43, 48],     // lift1: lift2: lift:
    num_pct: [0, 100],       // hand1: hand2: hand:
    num_move_ms: [100, 5000],// fw: bw: tl: tr:
    num_wait_ms: [0, 10000], // wait:
    num_head_speed: [10, 200]// hs:
};

Object.keys(METO_RANGE).forEach(function (type) {
    var r = METO_RANGE[type];
    Blockly.Blocks[type] = {
        init: function () {
            this.appendDummyInput()
                .appendField(new Blockly.FieldNumber(0, r[0], r[1], 1), 'NUM');
            this.setOutput(true, 'Number');
            this.setStyle('math_blocks');
            this.setTooltip('ใส่ได้ตั้งแต่ ' + r[0] + ' ถึง ' + r[1]);
        }
    };
});

// ---------- Motion ----------
Blockly.Blocks['move_timed'] = {
    init: function () {
        this.appendValueInput('MS')
            .setCheck('Number')
            .appendField(new Blockly.FieldDropdown([['forward', 'fw'], ['backward', 'bw']]), 'DIR')
            .appendField('for');
        this.appendDummyInput().appendField('ms');
        this.setInputsInline(true);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setStyle('movement_blocks');
        this.setTooltip('เดินหน้าหรือถอยตามเวลา 100–5000 มิลลิวินาที (1000 ms = 1 วินาที) · เดินหน้าจะหยุดเองถ้าเจอขอบโต๊ะ');
    }
};
Blockly.Blocks['turn_timed'] = {
    init: function () {
        this.appendValueInput('MS')
            .setCheck('Number')
            .appendField('turn')
            .appendField(new Blockly.FieldDropdown([['left', 'tl'], ['right', 'tr']]), 'DIR')
            .appendField('for');
        this.appendDummyInput().appendField('ms');
        this.setInputsInline(true);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setStyle('movement_blocks');
        this.setTooltip('เลี้ยวซ้ายหรือขวาตามเวลา 100–5000 มิลลิวินาที');
    }
};
Blockly.Blocks['move_stop'] = {
    init: function () {
        this.appendDummyInput().appendField('stop');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setStyle('movement_blocks');
        this.setTooltip('หยุดล้อแบบค่อย ๆ ชะลอ (คำสั่ง x)');
    }
};

// ---------- Arm ----------
Blockly.Blocks['arm_lift'] = {
    init: function () {
        this.appendValueInput('DEG')
            .setCheck('Number')
            .appendField(new Blockly.FieldDropdown([
                ['Left Arm', 'lift1'], ['Right Arm', 'lift2'], ['Both Arms', 'lift']]), 'SIDE')
            .appendField('lift to');
        this.appendDummyInput().appendField('°');
        this.setInputsInline(true);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setStyle('arm_blocks');
        this.setTooltip('ยกแขนไปที่มุม −43 ถึง 48 องศาจากแนวนอน · ค่าบวก = ยกขึ้น · 0 = แนวนอน');
    }
};

// ---------- Hand ----------
Blockly.Blocks['hand_grip_pct'] = {
    init: function () {
        this.appendValueInput('PCT')
            .setCheck('Number')
            .appendField(new Blockly.FieldDropdown([
                ['Left Hand', 'hand1'], ['Right Hand', 'hand2'], ['Both Hands', 'hand']]), 'SIDE')
            .appendField('หนีบ');
        this.appendDummyInput().appendField('%');
        this.setInputsInline(true);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setStyle('hand_blocks');
        this.setTooltip('ขยับมือไปที่ 0–100% · 0 = กางสุด · 100 = หนีบสุด');
    }
};

// ---------- Head ----------
Blockly.Blocks['head_yaw'] = {
    init: function () {
        this.appendValueInput('DEG')
            .setCheck('Number')
            .appendField('Head: turn to');
        this.appendDummyInput().appendField('°');
        this.setInputsInline(true);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setStyle('head_blocks');
        this.setTooltip('หันหัวไปที่มุม −90 ถึง 90 องศา · ค่าบวก = หันไปทางแขนซ้าย · 0 = มองตรง');
    }
};
Blockly.Blocks['head_tilt'] = {
    init: function () {
        this.appendValueInput('DEG')
            .setCheck('Number')
            .appendField('Head: tilt');
        this.appendDummyInput().appendField('°');
        this.setInputsInline(true);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setStyle('head_blocks');
        this.setTooltip('ก้มหรือเงยหัว −10 ถึง 10 องศา · ค่าบวก = เงย · ค่าลบ = ก้ม');
    }
};
Blockly.Blocks['head_speed'] = {
    init: function () {
        this.appendValueInput('SPEED')
            .setCheck('Number')
            .appendField('Head speed');
        this.appendDummyInput().appendField('°/s');
        this.setInputsInline(true);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setStyle('head_blocks');
        this.setTooltip('ตั้งความเร็วตอนหันหัว 10–200 องศาต่อวินาที (ค่าปกติ 90)');
    }
};

// ---------- Face ----------
// อารมณ์เต็มชุด = เปลี่ยนตา + ท่าทางหัวและแขน ค้าง 2.5 วิแล้วกลับปกติ (ยกเว้น Normal กับ Love)
var METO_EMO_CHOICES = [
    ['Normal', 'N'], ['Happy', 'H'], ['Sad', 'S'], ['Angry', 'A'], ['Shocked', 'O'],
    ['Sleepy', 'Z'], ['Confused', 'C'], ['Love', 'V'], ['Shy', 'B']
];
Blockly.Blocks['face_emotion'] = {
    init: function () {
        this.appendDummyInput()
            .appendField('Emotion:')
            .appendField(new Blockly.FieldDropdown(METO_EMO_CHOICES), 'EMO')
            .appendField('(ตา + ท่าทาง)');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setStyle('face_blocks');
        this.setTooltip('แสดงอารมณ์ทั้งตาและท่าทาง ค้างประมาณ 2.5 วินาทีแล้วกลับหน้าปกติ');
    }
};

// ---------- Control ----------
Blockly.Blocks['wait_ms'] = {
    init: function () {
        this.appendValueInput('MS')
            .setCheck('Number')
            .appendField('wait');
        this.appendDummyInput().appendField('ms');
        this.setInputsInline(true);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setStyle('loop_blocks');
        this.setTooltip('รอ 0–10000 มิลลิวินาที (1000 ms = 1 วินาที)');
    }
};
Blockly.Blocks['controls_forever'] = {
    init: function () {
        this.appendDummyInput().appendField('repeat forever');
        this.appendStatementInput('DO').appendField('do');
        this.setPreviousStatement(true, null);
        this.setNextStatement(false);
        this.setStyle('loop_blocks');
        this.setTooltip('ทำคำสั่งข้างในซ้ำไปเรื่อย ๆ จนกว่าจะกดหยุด (ถ้าข้างในไม่มีบล็อกเซนเซอร์ จะทำซ้ำ 100 รอบ)');
    }
};

// ---------- เซนเซอร์ (บล็อกเงื่อนไข ใช้ใน if / while / repeat until) ----------
// ตอนรัน เบราว์เซอร์จะส่งคำสั่งที่ค้างอยู่ให้หุ่นทำให้เสร็จก่อน แล้วอ่าน /state มาตัดสิน (ดู MetoRunner)
Blockly.Blocks['sensor_holding'] = {
    init: function () {
        this.appendDummyInput().appendField('holding something?');
        this.setOutput(true, 'Boolean');
        this.setStyle('gripper_blocks');
        this.setTooltip('จริง เมื่อหุ่นกำลังถือ/ยกของอยู่ (วัดด้วยเซนเซอร์ระยะ VL53)');
    }
};
Blockly.Blocks['sensor_grab_ok'] = {
    init: function () {
        this.appendDummyInput().appendField('Grab & Lift worked?');
        this.setOutput(true, 'Boolean');
        this.setStyle('gripper_blocks');
        this.setTooltip('จริง เมื่อบล็อก Grip: Grab & Lift ครั้งล่าสุดยกของขึ้นได้จริง');
    }
};
Blockly.Blocks['sensor_edge'] = {
    init: function () {
        this.appendDummyInput()
            .appendField('edge detected')
            .appendField(new Blockly.FieldDropdown([
                ['left or right', 'ANY'], ['left', 'L'], ['right', 'R']]), 'SIDE')
            .appendField('?');
        this.setOutput(true, 'Boolean');
        this.setStyle('movement_blocks');
        this.setTooltip('จริง เมื่อเซนเซอร์ใต้หุ่นเจอขอบโต๊ะ');
    }
};
Blockly.Blocks['sensor_face'] = {
    init: function () {
        this.appendDummyInput()
            .appendField('face seen is')
            .appendField(new Blockly.FieldDropdown([
                ['Happy', 'H'], ['Sad', 'S'], ['Normal', 'N'],
                ['any face', 'ANY'], ['no face', 'NONE']]), 'FACE')
            .appendField('?');
        this.setOutput(true, 'Boolean');
        this.setStyle('face_blocks');
        this.setTooltip('ดูหน้าคนจากกล้องบนหัวหุ่น · กล้องแยกได้ ยิ้ม / เศร้า / ปกติ');
    }
};
Blockly.Blocks['sensor_object'] = {
    init: function () {
        this.appendDummyInput().appendField('object in front?');
        this.setOutput(true, 'Boolean');
        this.setStyle('gripper_blocks');
        this.setTooltip('จริง เมื่อเซนเซอร์ระยะหน้าหุ่นเห็นของ (ไม่เกิน 30 ซม.)');
    }
};
Blockly.Blocks['sensor_touch'] = {
    init: function () {
        this.appendDummyInput().appendField('head touched?');
        this.setOutput(true, 'Boolean');
        this.setStyle('head_blocks');
        this.setTooltip('จริง เมื่อมีคนแตะแผ่นทองแดงบนหัวหุ่น ตั้งแต่ครั้งก่อนที่ถาม (แตะ / แตะสองที / กดค้าง)');
    }
};

// ---------- รอบ #501: กลับท่าเริ่มต้น / ย้อนทาง / หนีบไม่สำเร็จให้ย้อนกลับ ----------
Blockly.Blocks['motion_home'] = {
    init: function () {
        this.appendDummyInput().appendField('rest pose');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setStyle('movement_blocks');
        this.setTooltip('หัว แขน มือ กลับท่าพัก (ทุกข้อ 0) · ถ้าถือของอยู่ มือจะไม่ปล่อย');
    }
};
Blockly.Blocks['motion_back'] = {
    init: function () {
        this.appendDummyInput().appendField('go back to start');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setStyle('movement_blocks');
        this.setTooltip('เดินย้อนทุกช่วงที่ล้อเดินมาตั้งแต่เริ่มโปรแกรม กลับไปที่จุดเริ่ม');
    }
};
Blockly.Blocks['grip_failback'] = {
    init: function () {
        this.appendDummyInput().appendField('Grip: if grab fails, go back');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setStyle('gripper_blocks');
        this.setTooltip('วางไว้บนสุดของโปรแกรม · ถ้า Grab แล้วไม่เจอของ หุ่นจะเดินย้อนกลับจุดเริ่มเอง (ไม่วาง = หยุดรอตรงนั้น)');
    }
};

// ---------- ตัวสร้างคำสั่งของบล็อกใหม่ ----------
// ใช้ร่วมกันทั้ง generator ของ Blockly และ MetoRunner (ตัวรันทีละช่วง)
// nums = ช่องตัวเลขที่ต้องประเมินก่อน + ค่าเริ่มเมื่อช่องว่าง · build(block, v) คืนสตริงคำสั่ง
function metoClampInt(v, lo, hi) {
    v = Math.round(Number(v));
    if (isNaN(v)) v = lo;
    return Math.max(lo, Math.min(hi, v));
}

var METO_CMD = {
    move_timed: { nums: { MS: 1000 }, build: function (b, v) { return b.getFieldValue('DIR') + ':' + metoClampInt(v.MS, 100, 5000) + ';'; } },
    turn_timed: { nums: { MS: 500 }, build: function (b, v) { return b.getFieldValue('DIR') + ':' + metoClampInt(v.MS, 100, 5000) + ';'; } },
    move_stop: { nums: {}, build: function () { return 'x;'; } },
    arm_lift: { nums: { DEG: 0 }, build: function (b, v) { return b.getFieldValue('SIDE') + ':' + metoClampInt(v.DEG, -43, 48) + ';'; } },
    hand_grip_pct: { nums: { PCT: 50 }, build: function (b, v) { return b.getFieldValue('SIDE') + ':' + metoClampInt(v.PCT, 0, 100) + ';'; } },
    head_yaw: { nums: { DEG: 0 }, build: function (b, v) { return 'yaw:' + metoClampInt(v.DEG, -90, 90) + ';'; } },
    head_tilt: { nums: { DEG: 0 }, build: function (b, v) { return 'tilt:' + metoClampInt(v.DEG, -10, 10) + ';'; } },
    head_speed: { nums: { SPEED: 90 }, build: function (b, v) { return 'hs:' + metoClampInt(v.SPEED, 10, 200) + ';'; } },
    face_emotion: { nums: {}, build: function (b) { return 'emo:' + b.getFieldValue('EMO') + ';'; } },
    wait_ms: { nums: { MS: 500 }, build: function (b, v) { return 'wait:' + metoClampInt(v.MS, 0, 10000) + ';'; } },
    grip_percent: { nums: { PCT: 50 }, build: function (b, v) { return 'grip:' + metoClampInt(v.PCT, 0, 100) + ';'; } }
};

// ชนิดบล็อกเซนเซอร์ — มีตัวไหนในโปรแกรม = ต้องรันทีละช่วงแล้วอ่าน /state
var METO_SENSOR_TYPES = ['sensor_holding', 'sensor_grab_ok', 'sensor_edge', 'sensor_face', 'sensor_object', 'sensor_touch'];

// ตัดสินบล็อกเซนเซอร์จากค่า /state (ใช้ทั้งหุ่นจริงและค่าจำลอง)
// ctx (ไม่บังคับ) = ตัวรัน — ใช้จำว่าแตะหัวไปแล้วกี่ครั้ง
function metoSensorValue(block, s, ctx) {
    s = s || {};
    switch (block.type) {
        case 'sensor_object':
            // obj: 0 ไม่เห็น · 1 เห็น · 2 ถืออยู่ · 3 วางแล้ว — เฟิร์มแวร์เก่าไม่มี obj ใช้ vl_mm แทน
            if (typeof s.obj === 'number') return s.obj > 0;
            var mm = Number(s.vl_mm);
            return !isNaN(mm) && mm >= 0 && mm <= 300;
        case 'sensor_touch':
            // นับว่าแตะเมื่อ touchN เพิ่มจากครั้งก่อนที่ถาม (ถามแล้วถือว่ารับรู้ ครั้งหน้าต้องแตะใหม่)
            if (typeof s.touchN === 'number') {
                var seen = ctx && typeof ctx.touchSeen === 'number' ? ctx.touchSeen : s.touchN;
                if (ctx) ctx.touchSeen = s.touchN;
                return s.touchN > seen;
            }
            return Number(s.touchEvt) > 0;
        case 'sensor_holding': return Number(s.holding) === 1;
        case 'sensor_grab_ok': return Number(s.verify) === 1;
        case 'sensor_edge':
            var side = block.getFieldValue('SIDE');
            var l = Number(s.cliffL) === 1, r = Number(s.cliffR) === 1;
            return side === 'L' ? l : (side === 'R' ? r : (l || r));
        case 'sensor_face':
            // กล้องส่งตัวอักษรล่าสุด: H S N = อารมณ์ · L C R = ตำแหน่งหน้า (ก็คือเห็นหน้า) · X = ไม่เห็นหน้า
            var cam = String(s.cam || '-').charAt(0);
            var ok = Number(s.camOk) === 1;
            var want = block.getFieldValue('FACE');
            var seen = ok && 'LCRHSN'.indexOf(cam) !== -1 && cam !== '-';
            if (want === 'ANY') return seen;
            if (want === 'NONE') return !seen;
            return ok && cam === want;
    }
    return false;
}


//สร้างโค้ด
javascript.javascriptGenerator.forBlock['move_forward'] = function (block, generator) {
    // แก้ไข: ส่งรหัส 'w' (เดินหน้า) ตามด้วยเครื่องหมายคั่น ';'
    var code = 'w;';
    return code;
};
javascript.javascriptGenerator.forBlock['move_backward'] = function (block, generator) {
    var code = 's;';
    return code;
};
javascript.javascriptGenerator.forBlock['turn_left'] = function (block, generator) {
    var code = 'a;';
    return code;
};
javascript.javascriptGenerator.forBlock['turn_right'] = function (block, generator) {
    var code = 'd;';
    return code;
};

javascript.javascriptGenerator.forBlock['wait_one_sec'] = function (block, generator) {
    return 'z;';
};

javascript.javascriptGenerator.forBlock['delay_sec'] = function (block, generator) {
    var delayTime = generator.valueToCode(block, 'SEC', javascript.Order.ATOMIC) || '0';
    var n = parseInt(delayTime);
    if (isNaN(n) || n <= 0) return '';
    var code = '';
    for (var i = 0; i < n; i++) {
        code += 'z;';
    }
    return code; // เช่น Wait 3 sec → z;z;z;
};

javascript.javascriptGenerator.forBlock['start_program'] = function (block) {
    // Just return the code inside
    // The block itself generates no code, but the runCode logic will traverse the stack starting from here.
    return '';
};

javascript.javascriptGenerator.forBlock['arm_left_close'] = function (block, generator) {
    return 'r;';
};
javascript.javascriptGenerator.forBlock['arm_left_normal'] = function (block, generator) {
    return 'f;';
};
javascript.javascriptGenerator.forBlock['arm_left_open'] = function (block, generator) {
    return 'v;';
};
javascript.javascriptGenerator.forBlock['arm_right_close'] = function (block, generator) {
    return 't;';
};
javascript.javascriptGenerator.forBlock['arm_right_normal'] = function (block, generator) {
    return 'g;';
};
javascript.javascriptGenerator.forBlock['arm_right_open'] = function (block, generator) {
    return 'b;';
};
javascript.javascriptGenerator.forBlock['hand_left_down'] = function (block, generator) {
    return '1;';
};
javascript.javascriptGenerator.forBlock['hand_left_center'] = function (block, generator) {
    return '2;';
};
javascript.javascriptGenerator.forBlock['hand_left_up'] = function (block, generator) {
    return '3;';
};
javascript.javascriptGenerator.forBlock['hand_right_down'] = function (block, generator) {
    return '4;';
};
javascript.javascriptGenerator.forBlock['hand_right_center'] = function (block, generator) {
    return '5;';
};
javascript.javascriptGenerator.forBlock['hand_right_up'] = function (block, generator) {
    return '6;';
};
javascript.javascriptGenerator.forBlock['head_turn_right'] = function (block, generator) {
    return '7;';
};
javascript.javascriptGenerator.forBlock['head_center'] = function (block, generator) {
    return '8;';
};
javascript.javascriptGenerator.forBlock['head_turn_left'] = function (block, generator) {
    return '9;';
};

// Face Code Generators
javascript.javascriptGenerator.forBlock['face_normal'] = function (block, generator) {
    return 'u;';
};
javascript.javascriptGenerator.forBlock['face_look_left'] = function (block, generator) {
    return 'y;';
};
javascript.javascriptGenerator.forBlock['face_look_right'] = function (block, generator) {
    return 'i;';
};
javascript.javascriptGenerator.forBlock['face_happy'] = function (block, generator) {
    return 'h;';
};
javascript.javascriptGenerator.forBlock['face_sad'] = function (block, generator) {
    return 'j;';
};
javascript.javascriptGenerator.forBlock['face_angry'] = function (block, generator) {
    return 'k;'
};
javascript.javascriptGenerator.forBlock['face_shocked'] = function (block, generator) {
    return 'o;'
};
javascript.javascriptGenerator.forBlock['face_sleepy'] = function (block, generator) {
    return 'n;'
};
javascript.javascriptGenerator.forBlock['face_confused'] = function (block, generator) {
    return 'c;'
};
javascript.javascriptGenerator.forBlock['face_love'] = function (block, generator) {
    return 'l;'
};
javascript.javascriptGenerator.forBlock['face_shy'] = function (block, generator) {
    return 'e;'
};

// Gripper Code Generators
javascript.javascriptGenerator.forBlock['grip_smart'] = function (block, generator) {
    return 'G;';
};
javascript.javascriptGenerator.forBlock['grip_release'] = function (block, generator) {
    return 'P;';
};
javascript.javascriptGenerator.forBlock['grip_verify'] = function (block, generator) {
    return 'Q;';
};
// รอบ #501
javascript.javascriptGenerator.forBlock['motion_home'] = function () { return 'home;'; };
javascript.javascriptGenerator.forBlock['motion_back'] = function () { return 'back;'; };
javascript.javascriptGenerator.forBlock['grip_failback'] = function () { return 'failback:1;'; };
// grip_percent ย้ายไปใช้ METO_CMD (บีบค่าให้อยู่ 0–100 และปัดเป็นจำนวนเต็ม) — ดูด้านล่าง

/* Logic Unrolling for Repeat / If*/
javascript.javascriptGenerator.forBlock['controls_repeat_ext'] = function (block, generator) {
    // 1. Get the number of repeats
    var repeats = generator.valueToCode(block, 'TIMES', javascript.Order.ASSIGNMENT) || '0';
    // 2. Get the inner code (trim เพื่อลบ indent ที่ Blockly เพิ่มให้อัตโนมัติ)
    var branch = generator.statementToCode(block, 'DO').trim();
    // 3. Repeat the string N times
    var code = '';
    var n = parseInt(repeats);
    if (isNaN(n)) n = 0;

    for (var i = 0; i < n; i++) {
        code += branch;
    }

    return code;
};

javascript.javascriptGenerator.forBlock['controls_if'] = function (block, generator) {
    // If Block overrides standard IF to "Pre-calculate" the path
    var n = 0;
    var code = '';

    // Logic boolean "true" or "1 == 1"
    var conditionCode = generator.valueToCode(block, 'IF0', javascript.Order.NONE) || 'false';

    var isTrue = false;
    try {
        isTrue = eval(conditionCode);
    } catch (e) {
        console.error("Condition Eval Error", e);
    }

    if (isTrue) {
        code = generator.statementToCode(block, 'DO0');
    } else {
        code = generator.statementToCode(block, 'ELSE');
    }

    return code;
};

// While/Until Loop: Pre-evaluate เหมือน if block
// ถ้าเงื่อนไขเป็นจริง (WHILE) หรือเท็จ (UNTIL) → ทำซ้ำสูงสุด 100 รอบ (กันวน loop ไม่รู้จบ)
javascript.javascriptGenerator.forBlock['controls_whileUntil'] = function (block, generator) {
    var mode = block.getFieldValue('MODE'); // 'WHILE' or 'UNTIL'
    var conditionCode = generator.valueToCode(block, 'BOOL', javascript.Order.NONE) || 'false';
    var branch = generator.statementToCode(block, 'DO').trim();

    var conditionResult = false;
    try {
        conditionResult = eval(conditionCode);
    } catch (e) {
        console.error("While Condition Eval Error", e);
    }

    // WHILE = ทำซ้ำเมื่อเงื่อนไขเป็น true
    // UNTIL = ทำซ้ำเมื่อเงื่อนไขเป็น false (จนกว่าจะ true)
    var shouldRun = (mode === 'WHILE') ? conditionResult : !conditionResult;

    var code = '';
    if (shouldRun && branch) {
        var MAX_LOOPS = 100; // กันไม่ให้สร้างคำสั่งยาวเกินไป
        for (var i = 0; i < MAX_LOOPS; i++) {
            code += branch;
        }
    }

    return code;
};


// ---------- generator ของบล็อกใหม่ ----------
// ทางนี้ใช้กับ blockToCode() แบบเดิม (คลี่ทั้งโปรแกรมเป็นสตริงเดียว) — ตัวรันจริงคือ MetoRunner ด้านล่าง
// เก็บไว้ให้ครบ เผื่อโค้ดส่วนอื่นยังเรียก blockToCode อยู่
function metoGenNumber(block, name, def, generator) {
    var code = generator.valueToCode(block, name, javascript.Order.NONE);
    if (!code) return def;
    var n = Number(code);
    if (!isNaN(n)) return n;
    // สูตรตัวเลขล้วน เช่น (10 + 5) * 2 — คิดค่าได้เลย / มีตัวแปร = ไม่รู้ค่าตอนนี้ ใช้ค่าเริ่ม
    if (/^[\d\s+\-*/().%]+$/.test(code)) {
        try { n = Function('"use strict"; return (' + code + ');')(); } catch (e) { n = NaN; }
        if (!isNaN(n)) return n;
    }
    return def;
}

Object.keys(METO_RANGE).forEach(function (type) {
    javascript.javascriptGenerator.forBlock[type] = function (block) {
        var n = Number(block.getFieldValue('NUM'));
        return [n < 0 ? '(' + n + ')' : String(n), javascript.Order.ATOMIC];
    };
});

Object.keys(METO_CMD).forEach(function (type) {
    var spec = METO_CMD[type];
    javascript.javascriptGenerator.forBlock[type] = function (block, generator) {
        var v = {};
        Object.keys(spec.nums).forEach(function (name) {
            v[name] = metoGenNumber(block, name, spec.nums[name], generator);
        });
        return spec.build(block, v);
    };
});

METO_SENSOR_TYPES.forEach(function (type) {
    // ตอนคลี่ล่วงหน้าไม่มีค่าเซนเซอร์ — ถือว่าเป็นเท็จ (ตัวรันจริงอ่าน /state เอง)
    javascript.javascriptGenerator.forBlock[type] = function () {
        return ['false', javascript.Order.ATOMIC];
    };
});

javascript.javascriptGenerator.forBlock['controls_forever'] = function (block, generator) {
    var branch = generator.statementToCode(block, 'DO').trim();
    var code = '';
    for (var i = 0; i < 100; i++) code += branch;   // เพดานเดียวกับ while(true) เดิม
    return code;
};


// ==================== MetoRunner — ตัวรันโปรแกรมทีละช่วง ====================
// ปัญหาเดิม: โปรแกรมถูก "คลี่" เป็นสตริงเดียวในเบราว์เซอร์ก่อนส่ง หุ่นจึงไม่มีทางตัดสิน if/while
//            จากเซนเซอร์ระหว่างรัน (เฟิร์มแวร์ไม่มีคำสั่ง if)
// ทางที่ใช้ได้กับเฟิร์มแวร์ตอนนี้:
//   1. เบราว์เซอร์เดินบล็อกเอง สะสมคำสั่งไว้ในถัง
//   2. เจอบล็อกเซนเซอร์ → ส่งคำสั่งในถังไปหุ่น (/run) และซิม แล้วรอจนหุ่นว่าง (/state busy=0)
//   3. อ่าน /state สด → ตัดสินเงื่อนไข → เดินบล็อกต่อ
//   4. จบโปรแกรม → ส่งคำสั่งที่เหลือ
// โปรแกรมที่ไม่มีบล็อกเซนเซอร์ = ส่งครั้งเดียวทั้งก้อน เหมือนเดิมทุกอย่าง
// ไม่ได้ต่อหุ่นจริง = ใช้ค่าเซนเซอร์จากซิม (ขอบโต๊ะ = ขอบเวที, ถือของ = หลังสั่ง Grab)
//
// ตัวรันนี้ยังทำให้ตัวแปรใช้ได้จริงด้วย (เดิมเงื่อนไขที่มีตัวแปรจะกลายเป็น false เงียบ ๆ)
var MetoRunner = {
    LOOP_CAP: 100,          // วนซ้ำที่ไม่มีเซนเซอร์ — เท่าเพดาน while เดิม
    SENSOR_LOOP_CAP: 500,   // วนซ้ำที่รอเซนเซอร์ — กดหยุดได้ตลอด
    PIECE_MAX: 900,         // ความยาวสตริงสูงสุดต่อการยิง /run หนึ่งครั้ง

    // มีบล็อกเซนเซอร์อยู่ใต้บล็อกนี้ไหม (รวมบล็อกถัดไปทั้งสาย)
    usesSensors: function (block) {
        if (!block) return false;
        var all = block.getDescendants(false);
        for (var i = 0; i < all.length; i++) {
            if (METO_SENSOR_TYPES.indexOf(all[i].type) !== -1) return true;
        }
        return false;
    },

    _newCtx: function (dry) {
        return { dry: dry, buf: [], out: [], vars: {}, steps: 0, sensorReads: 0, source: null };
    },

    _stopFlag: false,

    // ปุ่มหยุดเรียก — ธงของตัวรันเอง (ธงของซิมถูกล้างทันทีที่ซิมจบช่วง จึงพึ่งอย่างเดียวไม่ได้)
    requestStop: function () { this._stopFlag = true; this._userStop = true; },

    _stopped: function (ctx) {
        if (ctx.dry) return false;
        return !!(ctx.stopped || this._stopFlag || (window.simStopRequested && window.simStopRequested()));
    },

    _sleep: function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); },

    // สร้างสตริงคำสั่งทั้งโปรแกรมโดยไม่ส่งอะไร (เซนเซอร์ = เท็จทุกตัว)
    compile: async function (startBlock) {
        var ctx = this._newCtx(true);
        await this._chain(startBlock ? startBlock.getNextBlock() : null, ctx);
        return ctx.out.join('');
    },

    // รันจริงแบบทีละช่วง — คืน { command, chunks, sensorReads, source }
    run: async function (startBlock) {
        var ctx = this._newCtx(false);
        if (window.simBeginProgram && !window.simBeginProgram()) {
            if (window.RobotLog) RobotLog.add('RUN', 'ยังรันอยู่ ไม่เริ่มรอบใหม่ซ้อน');
            return null;
        }
        ctx.chunks = 0;
        this._stopFlag = false;
        this._userStop = false;
        // จุดตั้งต้นของตัวนับบนหุ่น (บัค / แตะหัว) — นับเฉพาะที่เกิดในรอบนี้
        if (window.RobotSim && RobotSim.isLive && RobotSim.isLive()) {
            var s0 = await RobotSim.fetchState(1200, false);
            if (s0) { ctx.bugSeen = Number(s0.bugN) || 0; ctx.touchSeen = Number(s0.touchN) || 0; }
        } else if (window.RobotSim && RobotSim.simSensorState) {
            ctx.touchSeen = RobotSim.simSensorState().touchN;
        }
        try {
            await this._chain(startBlock.getNextBlock(), ctx);
        } catch (e) {
            console.warn('[MetoRunner] หยุดรันกลางทาง:', e.message);
            metoAlert('โปรแกรมยาวเกินไป', 'หุ่นหยุดไว้ก่อน ลองลดจำนวนรอบของ repeat ลงหน่อยนะ');
            ctx.buf = [];
        }
        await this._flush(ctx, true);
        // หุ่นจริง: รอคิวสุดท้ายจบแล้วอ่าน prog · ไม่ได้ต่อหุ่น: ใช้ผลจากซิม
        var last = ctx.robotDone ? await ctx.robotDone : null;
        last = last || ctx.lastRobotState;
        var prog = (last && typeof last.prog === 'number') ? last.prog
            : (window.RobotSim && RobotSim.state ? RobotSim.state.prog : 2);
        if (!ctx.noReport) metoReportProgramEnd(prog, {
            userStop: this._userStop, robot: !!last,
            failback: ctx.out.join('').indexOf('failback:1;') !== -1
        });
        return { command: ctx.out.join(''), chunks: ctx.chunks, sensorReads: ctx.sensorReads, source: ctx.source, prog: prog };
    },

    _chain: async function (block, ctx) {
        while (block && !this._stopped(ctx)) {
            await this._stmt(block, ctx);
            block = block.getNextBlock();
        }
    },

    _emit: function (code, ctx) {
        if (!code) return;
        ctx.buf.push(code);
        ctx.out.push(code);
    },

    _num: async function (block, name, def, ctx) {
        var t = block.getInputTargetBlock(name);
        if (!t) return def;
        var v = Number(await this._expr(t, ctx));
        return isNaN(v) ? def : v;
    },

    _bool: async function (block, name, ctx) {
        var t = block.getInputTargetBlock(name);
        if (!t) return false;
        return !!(await this._expr(t, ctx));
    },

    _varId: function (block) {
        try { return block.getFieldValue('VAR'); } catch (e) { return null; }
    },

    _stmt: async function (block, ctx) {
        var type = block.type;
        if (++ctx.steps > 20000) throw new Error('โปรแกรมยาวเกินไป');

        switch (type) {
            case 'start_program': return;

            case 'controls_repeat_ext': {
                var n = Math.trunc(await this._num(block, 'TIMES', 0, ctx));
                var body = block.getInputTargetBlock('DO');
                for (var i = 0; i < n && !this._stopped(ctx); i++) await this._chain(body, ctx);
                return;
            }

            case 'controls_whileUntil': {
                var until = block.getFieldValue('MODE') === 'UNTIL';
                var condB = block.getInputTargetBlock('BOOL');
                var sensing = this.usesSensors(condB) || this.usesSensors(block.getInputTargetBlock('DO'));
                var cap = sensing && !ctx.dry ? this.SENSOR_LOOP_CAP : this.LOOP_CAP;
                for (var k = 0; k < cap && !this._stopped(ctx); k++) {
                    var c = await this._bool(block, 'BOOL', ctx);
                    if (until) c = !c;
                    if (!c) break;
                    var before = ctx.out.length;
                    await this._chain(block.getInputTargetBlock('DO'), ctx);
                    // รอเซนเซอร์แบบไม่มีคำสั่งข้างใน (เช่น repeat until holding) — เว้นจังหวะไม่ให้ยิง /state รัว
                    if (sensing && !ctx.dry && ctx.out.length === before) await this._sleep(250);
                }
                return;
            }

            case 'controls_forever': {
                var bodyF = block.getInputTargetBlock('DO');
                var sensingF = this.usesSensors(bodyF);
                var capF = sensingF && !ctx.dry ? this.SENSOR_LOOP_CAP : this.LOOP_CAP;
                for (var f = 0; f < capF && !this._stopped(ctx); f++) {
                    var b4 = ctx.out.length;
                    await this._chain(bodyF, ctx);
                    if (sensingF && !ctx.dry && ctx.out.length === b4) await this._sleep(250);
                }
                return;
            }

            case 'controls_if': {
                var elseifs = block.elseifCount_ || 0;
                for (var j = 0; j <= elseifs; j++) {
                    if (await this._bool(block, 'IF' + j, ctx)) {
                        await this._chain(block.getInputTargetBlock('DO' + j), ctx);
                        return;
                    }
                }
                await this._chain(block.getInputTargetBlock('ELSE'), ctx);
                return;
            }

            case 'variables_set': {
                var vid = this._varId(block);
                var t = block.getInputTargetBlock('VALUE');
                ctx.vars[vid] = t ? await this._expr(t, ctx) : 0;
                return;
            }

            case 'math_change': {
                var cid = this._varId(block);
                ctx.vars[cid] = (Number(ctx.vars[cid]) || 0) + (await this._num(block, 'DELTA', 1, ctx));
                return;
            }

            case 'delay_sec': {
                // เหมือนเดิม: Wait N seconds = z ซ้ำ N ครั้ง (ปัดลง, ≤ 0 = ไม่ทำอะไร)
                var sec = Math.trunc(await this._num(block, 'SEC', 0, ctx));
                for (var z = 0; z < Math.min(sec, 600); z++) this._emit('z;', ctx);
                return;
            }
        }

        // บล็อกคำสั่งที่มีช่องตัวเลข / ตัวเลือก
        if (METO_CMD[type]) {
            var spec = METO_CMD[type], v = {};
            var names = Object.keys(spec.nums);
            for (var q = 0; q < names.length; q++) {
                v[names[q]] = await this._num(block, names[q], spec.nums[names[q]], ctx);
            }
            this._emit(spec.build(block, v), ctx);
            return;
        }

        // บล็อกคำสั่งตายตัวแบบเดิม (forward, Face: Happy, ...) — ใช้ generator เดิมของมัน
        var gen = javascript.javascriptGenerator.forBlock[type];
        if (gen) {
            var code = gen.call(block, block, javascript.javascriptGenerator);
            if (typeof code === 'string') this._emit(code, ctx);
        }
    },

    _expr: async function (b, ctx) {
        if (!b) return 0;
        var type = b.type;
        if (METO_RANGE[type] || type === 'math_number') return Number(b.getFieldValue('NUM'));

        switch (type) {
            case 'logic_boolean': return b.getFieldValue('BOOL') === 'TRUE';
            case 'variables_get': {
                var v = ctx.vars[this._varId(b)];
                return v === undefined ? 0 : v;
            }
            case 'math_arithmetic': {
                var x = await this._num(b, 'A', 0, ctx), y = await this._num(b, 'B', 0, ctx);
                switch (b.getFieldValue('OP')) {
                    case 'ADD': return x + y;
                    case 'MINUS': return x - y;
                    case 'MULTIPLY': return x * y;
                    case 'DIVIDE': return y === 0 ? 0 : x / y;
                    case 'POWER': return Math.pow(x, y);
                }
                return 0;
            }
            case 'math_random_int': {
                var lo = Math.round(await this._num(b, 'FROM', 1, ctx));
                var hi = Math.round(await this._num(b, 'TO', 10, ctx));
                if (lo > hi) { var tmp = lo; lo = hi; hi = tmp; }
                return lo + Math.floor(Math.random() * (hi - lo + 1));
            }
            case 'logic_compare': {
                var a = await this._expr(b.getInputTargetBlock('A'), ctx);
                var c = await this._expr(b.getInputTargetBlock('B'), ctx);
                switch (b.getFieldValue('OP')) {
                    case 'EQ': return a == c;
                    case 'NEQ': return a != c;
                    case 'LT': return a < c;
                    case 'LTE': return a <= c;
                    case 'GT': return a > c;
                    case 'GTE': return a >= c;
                }
                return false;
            }
            case 'logic_operation': {
                var isAnd = b.getFieldValue('OP') === 'AND';
                var l = await this._bool(b, 'A', ctx);
                if (isAnd && !l) return false;
                if (!isAnd && l) return true;
                return await this._bool(b, 'B', ctx);
            }
            case 'logic_negate': return !(await this._bool(b, 'BOOL', ctx));
        }

        if (METO_SENSOR_TYPES.indexOf(type) !== -1) {
            if (ctx.dry) return false;
            var s = await this._readSensors(ctx);
            var val = metoSensorValue(b, s, ctx);
            if (window.RobotLog) RobotLog.add('SENSE', b.toString() + ' → ' + (val ? 'จริง' : 'เท็จ') +
                ' (' + (ctx.source === 'robot' ? 'หุ่นจริง' : 'ซิม') + ')', s);
            return val;
        }

        // บล็อกค่าอื่นที่ไม่รู้จัก — ลองให้ generator ของ Blockly สร้างนิพจน์แล้วคิดค่า (แบบเดิม)
        try {
            var gen = javascript.javascriptGenerator.forBlock[type];
            if (gen) {
                var out = gen.call(b, b, javascript.javascriptGenerator);
                var code = Array.isArray(out) ? out[0] : out;
                return eval(code);
            }
        } catch (e) { /* คิดค่าไม่ได้ = 0 */ }
        return 0;
    },

    // ส่งคำสั่งที่ค้างให้เสร็จ แล้วอ่านเซนเซอร์
    _readSensors: async function (ctx) {
        await this._flush(ctx, false);
        ctx.sensorReads++;
        if (this._stopped(ctx)) return {};
        if (window.RobotSim && RobotSim.isLive && RobotSim.isLive()) {
            var s = await RobotSim.fetchState(1500, true);
            if (s) { ctx.source = 'robot'; return s; }
        }
        ctx.source = ctx.source || 'sim';
        return (window.RobotSim && RobotSim.simSensorState) ? RobotSim.simSensorState() : {};
    },

    // ส่งคำสั่งในถังไปหุ่นจริง + ซิม · final = ช่วงสุดท้ายของโปรแกรม
    _flush: async function (ctx, final) {
        var cmd = ctx.buf.join('');
        ctx.buf = [];
        if (this._stopped(ctx)) cmd = '';       // กดหยุดแล้ว คำสั่งที่ค้างในถังทิ้งไป
        if (!cmd && !final) return;
        if (cmd) ctx.chunks++;

        var live = window.RobotSim && RobotSim.isLive && RobotSim.isLive();
        var robotDone = Promise.resolve();
        if (cmd && !this._stopped(ctx)) {
            if (live) robotDone = this._sendAndWait(cmd, ctx);
            // ไม่มี /state ให้รอ — ยิงทางเดิมเฉพาะตอนเจอหุ่น (เฟิร์มแวร์เก่าก็ยังได้คำสั่ง แต่รอให้เสร็จไม่ได้)
            else if (typeof lastConnState !== 'undefined' && lastConnState === 'online') sendToRobot(cmd);
        }
        var simDone = window.runSimulation(cmd, { cont: true, more: !final && !this._stopped(ctx) })
            .then(function (ok) { if (ok === false) ctx.stopped = true; });
        // ช่วงสุดท้าย ไม่ต้องรอหุ่นจริงก่อนคืนปุ่ม Run — run() รอผล prog ต่อเอง
        if (final) { ctx.robotDone = robotDone; await simDone; return; }
        await Promise.all([simDone, robotDone]);
    },

    // ยิง /run แล้วรอจนหุ่นว่าง (busy=0, ล้อหยุด, มือหนีบจบ) — สตริงยาวแบ่งยิงทีละก้อน
    _sendAndWait: async function (cmd, ctx) {
        var host = RobotSim.host();
        var parts = cmd.split(';').filter(function (p) { return p.trim() !== ''; });
        var pieces = [], cur = '';
        parts.forEach(function (p) {
            if (cur && (cur.length + p.length + 1) > MetoRunner.PIECE_MAX) { pieces.push(cur); cur = ''; }
            cur += p + ';';
        });
        if (cur) pieces.push(cur);

        var s = null;
        for (var i = 0; i < pieces.length; i++) {
            if (this._stopped(ctx)) return s;
            if (window.RobotLog) RobotLog.add('SEND', 'ส่งช่วงคำสั่งไปหุ่นจริง', { cmd: pieces[i] });
            // 409 BUSY = หุ่นยังทำคิวเดิม/ท่าเดิมอยู่ ยังไม่ได้รับ — รอแล้วส่งใหม่ (เดิมนับว่ารับแล้ว)
            var sent = false, waitedBusy = false;
            for (var attempt = 0; attempt < 60 && !sent; attempt++) {
                if (this._stopped(ctx)) return s;
                var res = null;
                try { res = await fetch(host + '/run?cmd=' + encodeURIComponent(pieces[i])); } catch (e) { res = null; }
                if (!res) { if (window.RobotLog) RobotLog.add('SEND', 'ส่งไม่ถึงหุ่นจริง รันต่อเฉพาะในซิม'); return s; }
                if (res.status === 409) {
                    var why = '';
                    try { why = await res.text(); } catch (e) { }
                    if (why.indexOf('BUSY') === -1) {   // CALIB_MODE / FACE_TEST_ACTIVE — รอไปก็ไม่หาย
                        if (window.RobotLog) RobotLog.add('SEND', 'หุ่นไม่รับคำสั่ง (' + why + ')');
                        this._abortRun(ctx);
                        metoAlert('หุ่นอยู่ในโหมดตั้งค่า', 'หุ่นกำลังอยู่ในโหมด' +
                            (why.indexOf('FACE') !== -1 ? 'ทดสอบหน้า' : 'ตั้งค่าเซอร์โว (calib)') +
                            ' เลยรับโปรแกรมไม่ได้<br>ออกจากโหมดนั้นก่อน แล้วกด Run ใหม่นะ');
                        return s;
                    }
                    if (!waitedBusy) {
                        waitedBusy = true;
                        if (window.RobotLog) RobotLog.add('SEND', 'หุ่นยังไม่ว่าง (409 BUSY) รอแล้วส่งใหม่');
                        metoNote('หุ่นยังทำท่าเดิมอยู่ รอสักครู่ แล้วจะส่งโปรแกรมให้เอง…');
                    }
                    await this._sleep(500);
                    continue;
                }
                sent = true;
            }
            if (!sent) {                         // รอ 30 วิแล้วหุ่นยังไม่ว่าง
                this._abortRun(ctx);
                if (window.RobotLog) RobotLog.add('SEND', 'หุ่นไม่ว่างนานเกิน 30 วิ ยกเลิกการส่ง');
                metoNote('หุ่นยังไม่ว่าง ส่งโปรแกรมไม่ได้ กดหยุด แล้วกด Run ใหม่นะ');
                return s;
            }
            if (waitedBusy) metoNote('หุ่นว่างแล้ว ส่งโปรแกรมให้แล้ว!', 'success');
            // รอจนหุ่นทำคิวนี้เสร็จ (นานสุด 90 วิ ต่อก้อน) — ระหว่างรอดูบัค (bugN) กับสถานะโปรแกรม (prog)
            await this._sleep(120);
            var t0 = Date.now(), misses = 0;
            while (Date.now() - t0 < 90000) {
                if (this._stopped(ctx)) return s;
                var st = await RobotSim.fetchState(800, false);
                if (!st) { if (++misses >= 5) return s; }
                else {
                    s = st;
                    ctx.lastRobotState = st;
                    if (typeof st.bugN === 'number' && st.bugN > (ctx.bugSeen || 0)) {
                        ctx.bugSeen = st.bugN;
                        metoNoteBug(st.bug);
                    }
                    var idleNow = !Number(st.busy) && !Number(st.gripBusy) && !Number(st.mot);
                    // เฟิร์มแวร์ใหม่: prog ≠ 1 = จบคิวนี้แล้ว · เฟิร์มแวร์เก่าไม่มี prog ดูแค่ busy
                    if (idleNow && (typeof st.prog !== 'number' || st.prog !== 1)) break;
                }
                await this._sleep(150);
            }
            // หุ่นจบเองกลางโปรแกรม (เจอขอบ / หนีบไม่เจอของ) — หยุดส่งช่วงต่อไป และหยุดซิมให้ตรงกัน
            if (s && (s.prog === 3 || s.prog === 4)) {
                ctx.stopped = true;
                if (window.stopSimulation) window.stopSimulation();
                return s;
            }
        }
        return s;
    },

    // ยกเลิกรอบนี้โดยไม่ต้องรายงานผลจบโปรแกรม (ส่งไม่ได้ตั้งแต่ต้น)
    _abortRun: function (ctx) {
        ctx.stopped = true;
        ctx.noReport = true;
        if (window.stopSimulation) window.stopSimulation();
    }
};

// ---------- แจ้งผลการรัน (รอบ #501) ----------
// บัคที่ทำให้รันไม่ได้เลย = กล่องเด้ง (metoAlert) · บัคทั่วไป = โน้ตเล็ก ไม่ขวาง (metoNote) แล้วรันต่อ
function metoNote(text, type) {
    if (window.RobotLog) RobotLog.add('NOTE', text);
    if (typeof ProjectStore !== 'undefined' && ProjectStore._toast) ProjectStore._toast(text, type || 'warn');
}

function metoAlert(title, body) {
    if (window.SFX) SFX.nope();
    if (window.robotReact) window.robotReact('confused');
    return askInTheme({ title: title, body: body, okText: 'โอเค', single: true });
}

function metoNoteBug(bug) {
    metoNote('หุ่นงงคำสั่ง ' + (bug ? '"' + bug + '"' : '') + ' เลยข้ามไป ทำคำสั่งถัดไปต่อ');
}

// ซิมเจอคำสั่งที่ไม่รู้จัก — แจ้งเฉพาะตอนไม่ได้ต่อหุ่นจริง (ต่ออยู่ = หุ่นจริงแจ้งผ่าน bugN เอง)
window.onSimBug = function (bug) {
    if (window.RobotSim && RobotSim.isLive && RobotSim.isLive()) return;
    metoNoteBug(bug);
};

// prog: 2 จบครบ · 3 หยุด/เจอขอบ · 4 ภารกิจหนีบไม่สำเร็จ
function metoReportProgramEnd(prog, info) {
    info = info || {};
    var where = info.robot ? 'หุ่นจริง' : 'จอจำลอง';
    if (window.RobotLog) RobotLog.add('RUN', 'จบโปรแกรม prog=' + prog + ' (' + where + ')');
    if (prog === 2) {
        metoNote('รันโค้ดสำเร็จ!', 'success');
    } else if (prog === 3) {
        if (!info.userStop) metoNote('หยุด/เจอขอบโต๊ะ หุ่นหยุดรอตรงนี้');
    } else if (prog === 4) {
        var fb = !!info.failback;
        var msg = 'ภารกิจยกไม่สำเร็จ ไม่เจอของ';
        metoNote(msg);
        if (typeof addChatBubble === 'function') {
            addChatBubble(msg + '\n' + (fb ? 'หุ่นเดินย้อนกลับจุดเริ่มให้แล้ว' : 'หุ่นหยุดรออยู่ตรงนั้น') +
                '\nลองวางของให้อยู่ตรงหน้าหุ่น (ไม่เกิน 30 ซม.) แล้วกด Run ใหม่นะ', 'system-auto');
        }
    }
}


// ---------- คำอธิบายบล็อก (tooltip) ให้ครบทุกบล็อกใน toolbox ----------
// บล็อกเดิมบางตัวไม่มีคำอธิบาย และบล็อกมาตรฐานของ Blockly ขึ้นเป็นอังกฤษ — ตั้งทับหลัง init ของมัน
var METO_TOOLTIPS = {
    start_program: 'จุดเริ่มของโปรแกรม · หุ่นทำบล็อกที่ต่อใต้บล็อกนี้ทีละบล็อก จากบนลงล่าง',
    move_forward: 'เดินหน้า 1 วินาที (คำสั่ง w)',
    move_backward: 'ถอยหลัง 1 วินาที (คำสั่ง s)',
    turn_left: 'หมุนตัวไปทางซ้ายประมาณ 90° (คำสั่ง a)',
    turn_right: 'หมุนตัวไปทางขวาประมาณ 90° (คำสั่ง d)',
    head_turn_right: 'หันหัวไปทางขวา 40° (คำสั่ง 7)',
    head_center: 'หันหัวกลับมามองตรง (คำสั่ง 8)',
    head_turn_left: 'หันหัวไปทางซ้าย 40° (คำสั่ง 9)',
    face_normal: 'เปลี่ยนตาบนจอเป็นหน้าปกติ (คำสั่ง u)',
    face_look_left: 'ให้ตาเหลือบมองซ้าย (คำสั่ง y)',
    face_look_right: 'ให้ตาเหลือบมองขวา (คำสั่ง i)',
    face_happy: 'เปลี่ยนตาเป็นหน้ามีความสุข (คำสั่ง h)',
    face_sad: 'เปลี่ยนตาเป็นหน้าเศร้า (คำสั่ง j)',
    face_angry: 'เปลี่ยนตาเป็นหน้าโกรธ (คำสั่ง k)',
    face_shocked: 'เปลี่ยนตาเป็นหน้าตกใจ (คำสั่ง o)',
    face_sleepy: 'เปลี่ยนตาเป็นหน้าง่วง (คำสั่ง n)',
    face_confused: 'เปลี่ยนตาเป็นหน้างง (คำสั่ง c)',
    face_love: 'เปลี่ยนตาเป็นหน้ามีความรัก (คำสั่ง l)',
    face_shy: 'เปลี่ยนตาเป็นหน้าเขิน (คำสั่ง e)',
    grip_smart: 'เดินเข้าหาของด้วยเซนเซอร์ VL53 ลดแขนต่ำสุด แล้วหนีบ · ไม่เห็นของ = ภารกิจไม่สำเร็จ',
    grip_verify: 'เดินเข้าหาของ → หนีบที่แขนต่ำสุด → ยกขึ้น 8° → เช็คว่าจับได้ · ไม่เห็นของ = ภารกิจไม่สำเร็จ',
    wait_one_sec: 'รอ 1 วินาที แล้วค่อยทำบล็อกถัดไป',
    math_number: 'ตัวเลข · กดแล้วพิมพ์เลขที่ต้องการ',
    controls_repeat_ext: 'ทำคำสั่งข้างในซ้ำตามจำนวนครั้งที่ใส่',
    controls_whileUntil: function () {
        return this.getFieldValue('MODE') === 'UNTIL'
            ? 'ทำคำสั่งข้างในซ้ำ จนกว่าเงื่อนไขจะเป็นจริง'
            : 'ทำคำสั่งข้างในซ้ำ ตราบที่เงื่อนไขยังจริง';
    },
    controls_if: function () {
        return this.elseCount_
            ? 'ถ้าเงื่อนไขจริง ทำคำสั่งช่องบน · ถ้าไม่จริง ทำคำสั่งช่อง else'
            : 'ถ้าเงื่อนไขจริง ทำคำสั่งข้างใน · ถ้าไม่จริง ข้ามไปเลย';
    },
    logic_compare: function () {
        return {
            EQ: 'จริง เมื่อสองค่าเท่ากัน', NEQ: 'จริง เมื่อสองค่าไม่เท่ากัน',
            LT: 'จริง เมื่อค่าซ้ายน้อยกว่าค่าขวา', LTE: 'จริง เมื่อค่าซ้ายน้อยกว่าหรือเท่ากับค่าขวา',
            GT: 'จริง เมื่อค่าซ้ายมากกว่าค่าขวา', GTE: 'จริง เมื่อค่าซ้ายมากกว่าหรือเท่ากับค่าขวา'
        }[this.getFieldValue('OP')] || 'เปรียบเทียบสองค่า';
    },
    logic_operation: function () {
        return this.getFieldValue('OP') === 'OR'
            ? 'จริง เมื่อเงื่อนไขข้างใดข้างหนึ่งจริง (หรือ)'
            : 'จริง เมื่อเงื่อนไขทั้งสองข้างจริง (และ)';
    },
    logic_negate: 'กลับค่าเงื่อนไข: จริงกลายเป็นเท็จ เท็จกลายเป็นจริง (ไม่)',
    logic_boolean: 'ค่าจริง (true) หรือเท็จ (false)',
    math_arithmetic: function () {
        return {
            ADD: 'บวกสองตัวเลข', MINUS: 'เอาตัวเลขซ้ายลบตัวเลขขวา', MULTIPLY: 'คูณสองตัวเลข',
            DIVIDE: 'เอาตัวเลขซ้ายหารด้วยตัวเลขขวา', POWER: 'ยกกำลัง: ตัวเลขซ้ายยกกำลังตัวเลขขวา'
        }[this.getFieldValue('OP')] || 'คิดเลขสองตัวเลข';
    },
    math_random_int: 'สุ่มเลขจำนวนเต็มระหว่างสองค่า (สุ่มได้ทั้งสองค่าด้วย)',
    variables_set: 'เก็บค่าลงในตัวแปร',
    variables_get: 'ค่าที่เก็บอยู่ในตัวแปรนี้',
    math_change: 'เพิ่มค่าของตัวแปร (ใส่เลขติดลบ = ลด)'
};
Object.keys(METO_TOOLTIPS).forEach(function (type) {
    var def = Blockly.Blocks[type];
    if (!def || !def.init) return;
    var init = def.init;
    def.init = function () {
        init.apply(this, arguments);
        this.setTooltip(METO_TOOLTIPS[type]);
    };
});

// ---------- คำอธิบายตอนชี้ของปุ่ม/ป้ายทั้งเว็บ (MetoTip) ----------
// เปลี่ยน title= (กล่องเทาของเบราว์เซอร์) เป็นกล่องแบบเดียวกับคำอธิบายบล็อก และขึ้นเร็วเท่ากัน
// ย้าย title ไปเก็บที่ data-meto-tip ตอนชี้ (กันกล่องของเบราว์เซอร์ซ้อน) · โค้ดที่ตั้ง title ใหม่ภายหลังก็ยังได้ผล
var MetoTip = {
    div: null, timer: null, target: null,
    init: function () {
        var self = this;
        document.addEventListener('mouseover', function (e) {
            var el = e.target && e.target.closest ? e.target.closest('[title], [data-meto-tip]') : null;
            if (!el || el.closest('svg')) return;   // SVG ของ Blockly มีคำอธิบายของตัวเอง
            if (el.getAttribute('title')) {
                el.setAttribute('data-meto-tip', el.getAttribute('title'));
                el.removeAttribute('title');
            }
            if (el === self.target) return;
            self.hide();
            self.target = el;
            var x = e.clientX, y = e.clientY;
            self.timer = setTimeout(function () { self.show(el, x, y); }, window.METO_TOOLTIP_MS || 400);
        });
        document.addEventListener('mouseout', function (e) {
            if (self.target && (!e.relatedTarget || !self.target.contains(e.relatedTarget))) self.hide();
        });
        document.addEventListener('pointerdown', function () { self.hide(); }, true);
        window.addEventListener('scroll', function () { self.hide(); }, true);
    },
    show: function (el, x, y) {
        var text = el.getAttribute('data-meto-tip');
        if (!text || !document.body.contains(el)) return;
        if (!this.div) {
            this.div = document.createElement('div');
            this.div.className = 'meto-tip';
            document.body.appendChild(this.div);
        }
        this.div.textContent = text;
        this.div.style.display = 'block';
        // ใต้เมาส์ 18px ชิดขอบจอไม่ให้ล้น
        var w = this.div.offsetWidth, h = this.div.offsetHeight;
        this.div.style.left = Math.max(4, Math.min(x, window.innerWidth - w - 4)) + 'px';
        this.div.style.top = (y + 18 + h > window.innerHeight ? y - h - 8 : y + 18) + 'px';
    },
    hide: function () {
        clearTimeout(this.timer);
        this.target = null;
        if (this.div) this.div.style.display = 'none';
    }
};
MetoTip.init();

// ให้คำอธิบายขึ้นเร็วขึ้น (เดิม 750 ms) — Blockly 13 ฝังเวลาไว้ในไลบรารี ตั้ง Tooltip.HOVER_MS แล้วไม่มีผล
// จึงแก้ vendor/blockly.min.js จุดเดียวให้อ่านค่านี้แทน (สำรอง .bak-20261108-ก่อนเร่งคำอธิบาย)
window.METO_TOOLTIP_MS = 400;

//ตั้งค่าธีมและหน้าตา
// สร้างธีมใหม่ชื่อ Minimal
var MMTheme = Blockly.Theme.defineTheme('minimal', {
    'base': Blockly.Themes.Classic,
    'blockStyles': {
        // กำหนดสีของบล็อกแต่ละหมวด (Scratch 3.0 Style)
        'motion': { 'colourPrimary': '#4C97FF', 'colourTertiary': '#3373CC' },     // Motion (Blue)
        'arm': { 'colourPrimary': '#9966FF', 'colourTertiary': '#774DCB' },        // Looks (Purple)
        'hand': { 'colourPrimary': '#CF63CF', 'colourTertiary': '#BD42BD' },       // Sound (Pink)
        'head': { 'colourPrimary': '#FFBF00', 'colourTertiary': '#E6AC00' },       // Events (Yellow)
        'control': { 'colourPrimary': '#FFAB19', 'colourTertiary': '#CF8B17' },    // Control (Orange)
        'operator': { 'colourPrimary': '#59C059', 'colourTertiary': '#389438' },   // Operators (Green)
        // 'hat': 'cap' คือตัวที่ทำให้ Blockly วาดทรงหมวกจริง
        // ไม่ใส่ = START PROGRAM หน้าตาเป็นบล็อกสี่เหลี่ยมสีส้มธรรมดา
        // แยกไม่ออกจาก repeat/if ที่อยู่หมวดเดียวกันสีเดียวกัน
        'hat_blocks': { 'colourPrimary': '#FFAB19', 'colourTertiary': '#CF8B17', 'hat': 'cap' }, // Hat blocks often share control color

        // Maps to original style names used in block definitions
        'movement_blocks': { 'colourPrimary': '#4C97FF', 'colourTertiary': '#3373CC' },
        'arm_blocks': { 'colourPrimary': '#9966FF', 'colourTertiary': '#774DCB' },
        'hand_blocks': { 'colourPrimary': '#CF63CF', 'colourTertiary': '#BD42BD' },
        'head_blocks': { 'colourPrimary': '#FFBF00', 'colourTertiary': '#E6AC00' },
        'stop_blocks': { 'colourPrimary': '#FF6680', 'colourTertiary': '#CD3333' },
        'face_blocks': { 'colourPrimary': '#FF6680', 'colourTertiary': '#CD3333' },
        'gripper_blocks': { 'colourPrimary': '#00B4AB', 'colourTertiary': '#009690' },
        'loop_blocks': { 'colourPrimary': '#FFAB19', 'colourTertiary': '#CF8B17' },
        'logic_blocks': { 'colourPrimary': '#59C059', 'colourTertiary': '#389438' },
        // บล็อกคณิต (บวกลบ/สุ่ม) อยู่หมวด Operator → สีเขียวเดียวกัน (เดิมไม่ได้ตั้ง ได้น้ำเงินม่วงของ Classic)
        'math_blocks': { 'colourPrimary': '#59C059', 'colourTertiary': '#389438' },
        // บล็อกตัวแปร → สีส้มตามตารางสีหมวด §3.2 (เดิมได้ชมพูของ Classic)
        'variable_blocks': { 'colourPrimary': '#FF8C1A', 'colourTertiary': '#DB6E00' }
    },
    // สีพื้นของ Blockly ต้องตั้งตรงนี้ ไม่ใช่ทับด้วย CSS
    // (Blockly เอา workspaceBackgroundColour ไปทำเป็น <pattern> ของกริด
    //  ถ้าไปตั้ง fill ให้ .blocklyMainBackground จะโดน pattern ทับหมด)
    // โทนอุ่นให้เข้าธีมเกมของฝั่งสมาชิก — แต่ยังจางพอที่บล็อกสีสดจะเด่นกว่าพื้นเสมอ
    'componentStyles': {
        'workspaceBackgroundColour': '#eef4e2', //พื้น — เขียวอมครีมจาง เหมือนโต๊ะทำงานกลางแจ้ง
        'toolboxBackgroundColour': '#f7ecd2',   //แถบเมนู — ไม้ครีม
        'toolboxForegroundColour': '#3d3226',   //ตัวหนังสือเมนู — น้ำตาลเข้ม
        'flyoutBackgroundColour': '#fdf8ea',
        'flyoutOpacity': 1,
        'scrollbarColour': '#c2b394',
        'scrollbarOpacity': 0.5,
        'insertionMarkerColour': '#3A53A4',
        'insertionMarkerOpacity': 0.3
    },
    'fontStyle': {
        // ฟอนต์เดียวกับทั้งเว็บ (--font-ui ใน style.css) — เดิม Segoe UI ตัวไทยบนบล็อกจึงไม่ตรงกับที่อื่น
        'family': "'Prompt', 'Segoe UI', 'Roboto', sans-serif",
        'weight': 'bold',
        'size': 12
    }
});

// ==================== Activity Logging ====================

function logActivity(actionType, metadata) {
    // Only log if user is logged in
    if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) return;
    try {
        fetch('/api/activity', {
            method: 'POST',
            headers: Auth.getHeaders(),
            body: JSON.stringify({
                action_type: actionType,
                metadata_json: metadata ? JSON.stringify(metadata) : null
            })
        }).catch(function() {});
    } catch (e) { /* silent */ }
}

// ==================== Event Logging (ข้อ 4.7) ====================
// เหตุการณ์ในเบราว์เซอร์ที่เซิร์ฟเวอร์มองไม่เห็นเอง — ส่งเป็นชุดเพื่อลดจำนวน request
// ตัวที่แผนบอกว่า "ขาดมากที่สุด" คือ workspace.block_changed (เด็กลาก/ลบบล็อกอะไรบ้าง)

var MetoEvents = {
    _queue: [],
    _timer: null,
    _sessionId: null,

    sessionId: function () {
        if (!this._sessionId) {
            // id ของ "ครั้งที่นั่งทำงาน" ใช้ร้อยเหตุการณ์ในคาบเดียวกันเข้าด้วยกัน
            this._sessionId = (window.crypto && crypto.randomUUID)
                ? crypto.randomUUID()
                : 'w' + Date.now() + Math.random().toString(16).slice(2, 8);
        }
        return this._sessionId;
    },

    newCorrelationId: function () {
        return (window.crypto && crypto.randomUUID)
            ? crypto.randomUUID()
            : 'c' + Date.now() + Math.random().toString(16).slice(2, 8);
    },

    record: function (eventName, payload, options) {
        if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) return;
        options = options || {};
        this._queue.push({
            event_name: eventName,
            payload: payload || {},
            session_id: this.sessionId(),
            correlation_id: options.correlationId || null,
            subject_type: options.subjectType || null,
            subject_id: options.subjectId || null,
        });
        // ส่งรวมกันทุก 3 วินาที หรือทันทีเมื่อคิวยาว
        if (this._queue.length >= 25) return this.flush();
        if (!this._timer) {
            this._timer = setTimeout(this.flush.bind(this), 3000);
        }
    },

    flush: function () {
        if (this._timer) { clearTimeout(this._timer); this._timer = null; }
        if (!this._queue.length) return;
        if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) { this._queue = []; return; }

        var batch = this._queue.splice(0, this._queue.length);
        try {
            fetch('/api/events', {
                method: 'POST',
                headers: Auth.getHeaders(),
                body: JSON.stringify({ events: batch })
            }).catch(function () { /* เก็บสถิติไม่ได้ ต้องไม่รบกวนการเล่น */ });
        } catch (e) { /* silent */ }
    }
};

// ปิดหน้าเว็บ/สลับแท็บ → ส่งของที่ค้างในคิวก่อน
window.addEventListener('pagehide', function () { MetoEvents.flush(); });
document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') MetoEvents.flush();
});

// Make workspace a global but init lazily
var workspace = null;

function initWorkspace() {
    if (workspace) return; // already initialized

    // เริ่มต้น Workspace พร้อมตั้งค่า Renderer ใหม่
    workspace = Blockly.inject('blocklyDiv', {
        toolbox: document.getElementById('toolbox'),

        //zelos โค้งมนเหมือน Scratch 3.0
        renderer: 'zelos',

        theme: MMTheme,

        // ปรับ Grid ให้ดูจางลง
        grid: {
            spacing: 25,
            length: 3,
            colour: '#cbd9b8', // สีจุด Grid — เขียวจาง ให้กลืนกับพื้นโทนอุ่น
            snap: true
        },

        // ปรับ Zoom
        zoom: {
            controls: false, // ปิดปุ่ม Zoom ของเดิม
            wheel: true,
            startScale: 0.9,
            maxScale: 3,
            minScale: 0.3,
            scaleSpeed: 1.2
        },

        // ปิดถังขยะของเดิม
        trashcan: false,

        // เสียงของ Blockly เอง (click/disconnect/delete) โหลด mp3 จาก static.blockly.com
        // ห้องที่เน็ตไม่เสถียร = 404 เงียบ ๆ และเสียเวลายิง request ทิ้งทุกครั้งที่โหลดหน้า
        // โปรเจกต์นี้มี sfx.js ที่สังเคราะห์เสียงสดอยู่แล้ว (ไม่มีไฟล์เสียงสักไฟล์ — THEME.md ข้อ 13)
        // จึงปิดของ Blockly ทิ้ง แล้วใช้ของโปรเจกต์แทน (ผูกไว้ที่ blockSoundListener)
        sounds: false
    });

    // จำบล็อกที่เลือกไว้ (SELECTED เป็น UI event — listener อื่นในไฟล์นี้ข้ามมันหมด)
    workspace.addChangeListener(rememberSelection);
    // เสียงตอนลาก/ต่อ/ลบบล็อก
    workspace.addChangeListener(blockSoundListener);
    // แถบภารกิจ — ติ๊กเช็กลิสต์ใหม่ทุกครั้งที่กระดานเปลี่ยน
    workspace.addChangeListener(function (event) {
        if (event && event.isUiEvent) return;
        if (typeof Mission !== 'undefined') Mission.refresh();
    });

    syncSfxButton();
    bindHeaderSounds();

    //ทำให้หน้าต่างบล็อกค้างไว้เสมอ
    // ป้องกัน Flyout ปิดเองเมื่อคลิกที่ว่าง
    if (workspace.getFlyout()) {
        workspace.getFlyout().autoClose = false;

        // ป้องกันหน้าต่างเลือกบล็อก (Flyout) ซูมตามกระดาน (Workspace)
        // ทำให้ขนาดบล็อกในเมนูคงที่เสมอเหมือน Scratch
        workspace.getFlyout().getFlyoutScale = function () {
            return 1;
        };
    }

    // Fix Toolbox Colors via JavaScript
    function applyCategoryClasses() {
        var categories = document.getElementsByClassName('blocklyToolboxCategory');
        if (categories.length === 0) {
            setTimeout(applyCategoryClasses, 100); // ถ้ายังไม่มา ให้รอ
            return;
        }

        // ลูปใส่ Class ให้แต่ละหมวดตามลำดับ (cat-0, cat-1, ...)
        for (var i = 0; i < categories.length; i++) {
            categories[i].classList.add('cat-' + i);
        }
    }

    // ใส่ทันทีหลังสร้าง toolbox — เดิมรอ 500 ms ไอคอนหมวดเลยขึ้นเป็นกล่องเทาก่อนแล้วค่อยเปลี่ยนสี
    applyCategoryClasses();

    // Blockly วัดความกว้างตัวหนังสือตอนวาดครั้งแรก ถ้าตอนนั้น Prompt ยังโหลดไม่เสร็จ
    // บล็อกจะกว้างผิด (วัดด้วยฟอนต์สำรอง) — โหลดเสร็จแล้วให้วัดและวาดใหม่
    if (document.fonts && document.fonts.load) {
        Promise.all([
            document.fonts.load("bold 12px 'Prompt'", 'กA'),
            document.fonts.load("600 13px 'Prompt'", 'กA')
        ]).then(function () {
            workspace.getAllBlocks(false).forEach(function (b) {
                b.inputList.forEach(function (input) {
                    input.fieldRow.forEach(function (f) { if (f.forceRerender) f.forceRerender(); });
                });
            });
        }).catch(function () { /* ฟอนต์โหลดไม่ได้ ใช้ฟอนต์สำรองต่อ */ });
    }
    // เรียกซ้ำเมื่อมีการปรับขนาดจอ (เผื่อ Blockly วาดใหม่)
    window.addEventListener('resize', function () {
        setTimeout(applyCategoryClasses, 200);
    });

    // Init AI session and change listener after workspace is ready
    initAISession();

    // Project save/load: restore autosave + attach autosave listener
    ProjectStore.attach();
}

// ฟังก์ชันสำหรับ Custom Toolbar
function centerWorkspace() {
    workspace.scrollCenter();
    workspace.setScale(0.9); // Reset Zoom
}

function zoomIn() {
    workspace.zoomCenter(1);
}

function zoomOut() {
    workspace.zoomCenter(-1);
}

// อ่านบล็อกที่ถูกเลือกอยู่
// Blockly 13 ถอด Blockly.selected ทิ้ง และย้ายการเลือกไปอยู่กับ FocusManager
// ลองทีละทางจนกว่าจะเจอ เพื่อให้ทำงานได้ทั้งเวอร์ชันเก่าและใหม่
function getSelectedBlock() {
    var b = null;
    try { if (typeof Blockly.getSelected === 'function') b = Blockly.getSelected(); } catch (e) { }
    if (!b && Blockly.common && typeof Blockly.common.getSelected === 'function') {
        try { b = Blockly.common.getSelected(); } catch (e) { }
    }
    if (!b && typeof Blockly.getFocusManager === 'function') {
        try {
            var node = Blockly.getFocusManager().getFocusedNode();
            // เอาเฉพาะ node ที่เป็นบล็อกจริง (มี dispose + type)
            if (node && typeof node.dispose === 'function' && node.type) b = node;
        } catch (e) { }
    }
    if (!b) b = Blockly.selected || null;
    // กันเผลอลบทั้ง workspace: ต้องเป็นบล็อกที่ยังไม่ถูกลบเท่านั้น
    if (b && typeof b.dispose === 'function' && !b.isDeadOrDying?.()) return b;
    return null;
}

// จำบล็อกที่เลือกล่าสุดไว้
// เพราะพอเด็กกดปุ่มถังขยะ focus จะย้ายจากบล็อกไปที่ปุ่ม
// ทำให้ตอน deleteBlock() ทำงาน getSelectedBlock() คืน null ไปแล้ว
var _lastSelectedBlockId = null;

function rememberSelection(event) {
    if (!event || event.type !== Blockly.Events.SELECTED) return;
    _lastSelectedBlockId = event.newElementId || null;
}

// บล็อกที่ "กำลังเลือก" หรือ "เพิ่งเลือกไปเมื่อกี้" — ตัวไหนก็ได้ที่ยังอยู่จริง
function getTargetBlock() {
    var live = getSelectedBlock();
    if (live) return live;
    if (_lastSelectedBlockId && workspace) {
        var b = workspace.getBlockById(_lastSelectedBlockId);
        if (b && !b.isDeadOrDying?.()) return b;
    }
    return null;
}

// ปุ่มถังขยะ — ลบเฉพาะบล็อกที่เลือก
// เดิมอ่าน Blockly.selected ซึ่งเป็น undefined เสมอบน Blockly 13 → ตกไป workspace.clear()
// ทุกครั้ง = งานเด็กหายทั้งกระดานโดยไม่ถาม (autosave เขียนทับใน 1 วินาที กู้ไม่ทัน)
function deleteBlock() {
    var selected = getTargetBlock();
    if (selected) {
        _lastSelectedBlockId = null;
        // ผูกเสียงตรงนี้ ไม่ผ่าน change listener — Blockly ไม่ได้ยิง event delete
        // ทุกครั้งที่ dispose() จึงเชื่อ event ไม่ได้ ต้องดักที่ทางที่เด็กกดจริง
        if (window.SFX) SFX.sweep(600, 200, 0.12, 'square', 0, 0.4);
        selected.dispose(true); // ลบบล็อกที่เลือก (และลูกๆ)
        return;
    }
    // ไม่ได้เลือกบล็อกไหนไว้ = อย่าเพิ่งลบอะไร บอกเด็กว่าต้องทำยังไงก่อน
    var count = workspace.getAllBlocks(false).length;
    if (count === 0) return;
    if (typeof ProjectStore !== 'undefined' && ProjectStore._toast) {
        ProjectStore._toast('เลือกบล็อกที่อยากลบก่อนนะ แล้วค่อยกดถังขยะ (หรือกดค้างที่ปุ่มนี้เพื่อลบทั้งหมด)', 'warn');
    }
}

// กดถังขยะค้าง 800ms = ลบทั้งกระดาน แต่ต้องยืนยันก่อน
(function bindTrashLongPress() {
    var btn = document.getElementById('btn-trash');
    if (!btn) return;
    var timer = null;
    function start() {
        clearTimeout(timer);
        timer = setTimeout(function () {
            var count = workspace ? workspace.getAllBlocks(false).length : 0;
            if (count === 0) return;
            if (confirm('จะลบบล็อกทั้งหมด ' + count + ' อันใช่ไหม?\n(กด Ctrl+Z เรียกกลับได้)')) {
                workspace.clear();
            }
        }, 800);
    }
    function cancel() { clearTimeout(timer); }
    btn.addEventListener('mousedown', start);
    btn.addEventListener('touchstart', start, { passive: true });
    ['mouseup', 'mouseleave', 'touchend', 'touchcancel'].forEach(function (ev) {
        btn.addEventListener(ev, cancel);
    });
})();

// ---------- กล่องถามในธีม ----------
// แทน confirm() ของเบราว์เซอร์ ซึ่งเป็นกล่องเทาของ OS ปุ่มเขียนว่า "ตกลง/ยกเลิก"
// ตามภาษาเครื่อง ไม่ตรงกับคำถามที่ถาม และอ่านว่า "error dialog ของโปรแกรมผู้ใหญ่"
function askInTheme(opts) {
    return new Promise(function (resolve) {
        var old = document.getElementById('meto-ask');
        if (old) old.remove();

        var wrap = document.createElement('div');
        wrap.id = 'meto-ask';
        wrap.className = 'g-celebrate';   // ยืมม่านอุ่น + จัดกลางจอ (ไม่ได้สโคป mode-player)
        wrap.innerHTML =
            '<div class="g-celebrate-box">' +
            '<div class="g-title">' + (opts.title || 'เดี๋ยวก่อนนะ') + '</div>' +
            '<div class="g-label meto-ask-body">' + (opts.body || '') + '</div>' +
            '<div class="meto-ask-actions">' +
            (opts.single ? '' : '<button class="g-btn meto-ask-no">' + (opts.cancelText || 'กลับไปแก้') + '</button>') +
            '<button class="g-btn meto-ask-yes">' + (opts.okText || 'รันเลย') + '</button>' +
            '</div></div>';
        document.body.appendChild(wrap);
        requestAnimationFrame(function () { wrap.classList.add('is-on'); });

        function done(answer) {
            document.removeEventListener('keydown', onKey);
            wrap.remove();
            resolve(answer);
        }
        function onKey(e) {
            if (e.key === 'Escape') done(false);
            if (e.key === 'Enter') done(true);
        }
        var noBtn = wrap.querySelector('.meto-ask-no');
        if (noBtn) noBtn.onclick = function () { if (window.SFX) SFX.close(); done(false); };
        wrap.querySelector('.meto-ask-yes').onclick = function () { if (window.SFX) SFX.click(); done(true); };
        document.addEventListener('keydown', onKey);
        (noBtn || wrap.querySelector('.meto-ask-yes')).focus();
    });
}

// ---------- เสียง ----------
// sfx.js เขียนเสียงไว้ครบ 11 แบบตั้งแต่แรก แต่ script.js ไม่เคยเรียกเลยสักครั้ง
// หน้า Workspace ที่เด็กอยู่ 90% ของเวลาจึงเงียบสนิททั้งที่ระบบเสียงพร้อมใช้

// ---------- ปุ่มหยุด + สถานะกำลังรัน ----------
// เดิมไม่มีปุ่มหยุดเลย: while(true) คลี่เป็น 100 รอบ = ติดอยู่ 3 นาที
// และ repeat 1000 x 5 บล็อก = 50 นาทีที่กดหยุดไม่ได้ ต้องรีเฟรชทิ้งงาน
function stopRun() {
    if (window.stopSimulation) window.stopSimulation();
    if (typeof MetoRunner !== 'undefined') MetoRunner.requestStop();
    // เฟิร์มแวร์ 6 พ.ย. รับ x ระหว่างรันคิวได้แล้ว (x ตัวเดียว = หยุดทุกอย่างและทิ้งคิว)
    // เดิมปุ่มหยุดหยุดแค่ซิม หุ่นจริงยังเดินคิวต่อจนจบ — ยิงเฉพาะตอนเจอหุ่นในเครือข่าย ไม่งั้น console เละ
    if (lastConnState === 'online' || (window.RobotSim && RobotSim.isLive && RobotSim.isLive())) {
        var stopHost = (window.RobotSim && RobotSim.host) ? RobotSim.host() : 'http://MDTrobot.local';
        fetch(stopHost + '/run?cmd=x').catch(function () { });
        if (window.RobotLog) RobotLog.add('SEND', 'สั่งหุ่นจริงหยุด (x)');
    }
    if (window.SFX) SFX.close();
    if (typeof ProjectStore !== 'undefined' && ProjectStore._toast) {
        ProjectStore._toast('หยุดแล้ว หุ่นค้างอยู่ท่าเดิม กด Run ใหม่ได้เลย', 'warn');
    }
}

// robot-sim.js เรียกกลับมาบอกว่ากำลังรันอยู่หรือจบแล้ว
window.onSimRunStateChange = function (running) {
    // จำว่าโค้ดชุดไหนถูกรัน และหุ่นจำลองจบแบบไหน (prog 2 = ทำจนจบ) — ใช้ตัดสินโจทย์ท้าตอนกดส่ง
    try {
        if (running) {
            window.metoSimRunXml = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(workspace));
            window.metoSimRunEnd = null;
        } else if (window.RobotSim) {
            window.metoSimRunEnd = RobotSim.state.prog;
        }
    } catch (e) { }
    var run = document.getElementById('run-btn');
    var stop = document.getElementById('stop-btn');
    if (run) {
        run.disabled = !!running;
        run.textContent = running ? 'กำลังรัน…' : 'Run';
        run.classList.toggle('is-running', !!running);
    }
    if (stop) stop.style.display = running ? '' : 'none';
};

function toggleSfx() {
    if (!window.SFX) return;
    SFX.setEnabled(!SFX.enabled);
    syncSfxButton();
}

function syncSfxButton() {
    var btn = document.getElementById('sfx-btn');
    if (!btn || !window.SFX) return;
    var icon = btn.querySelector('.material-icons');
    if (icon) icon.textContent = SFX.enabled ? 'volume_up' : 'volume_off';
    btn.title = SFX.enabled ? 'ปิดเสียง' : 'เปิดเสียง';
    btn.classList.toggle('is-muted', !SFX.enabled);
}

// ปุ่มบน header ทุกตัวมีเสียงตอบ — ยกเว้นปุ่มปิดเสียงเอง (จะย้อนแย้ง)
function bindHeaderSounds() {
    var ids = ['run-btn', 'save-btn', 'new-project-btn', 'header-login-btn',
        'header-logout-btn', 'btn-center', 'btn-in', 'btn-out', 'btn-tutorial', 'twin-toggle'];
    ids.forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('click', function () { if (window.SFX) SFX.click(); });
        el.addEventListener('mouseenter', function () { if (window.SFX) SFX.hover(); });
    });
}

// เสียงตอนลาก/ต่อ/ลบบล็อก
// Blockly มีเสียงของตัวเองแต่โหลด mp3 จาก static.blockly.com (เน็ตหลุด = เงียบ)
// ใช้ sfx.js ที่สังเคราะห์สดแทน ตรงกับหลักการ "ไม่มีไฟล์เสียงสักไฟล์" ของโปรเจกต์
function blockSoundListener(event) {
    if (!event) return;
    // เด็กขยับ = ปลุกหุ่นถ้ามันง่วงอยู่ แล้วเริ่มนับเวลานิ่งใหม่
    if (window.robotNudgeAwake) window.robotNudgeAwake();

    if (event.type === Blockly.Events.BLOCK_CREATE) {
        if (window.SFX) SFX.blip(700, 0.04);                   // หยิบบล็อกใหม่ออกมา
        if (window.robotReact) window.robotReact('glance-left');
    } else if (event.type === Blockly.Events.BLOCK_DELETE) {
        if (window.SFX) SFX.sweep(600, 200, 0.12, 'square', 0, 0.4);
        if (window.robotReact) window.robotReact('shocked');
    } else if (event.type === Blockly.Events.BLOCK_MOVE) {
        // ต่อติดกับบล็อกอื่น = จังหวะที่ควรรู้สึกดีที่สุดตอนลาก
        if (event.newParentId && event.newParentId !== event.oldParentId) {
            if (window.SFX) SFX.ok();
            if (window.robotReact) window.robotReact('glance-right');
        }
    }
}

// ย่อ/ขยายการ์ดจอหุ่น — บนแท็บเล็ตมันเป็น overlay ทับพื้นที่ลากบล็อก
function toggleTwinPanel() {
    var panel = document.getElementById('twin-panel');
    if (!panel) return;
    var collapsed = panel.classList.toggle('twin-collapsed');
    var icon = document.getElementById('twin-toggle-icon');
    if (icon) icon.textContent = collapsed ? 'unfold_more' : 'unfold_less';
    panel.title = collapsed ? 'กดเพื่อกางจอหุ่น' : '';
    try { localStorage.setItem('meto_twin_collapsed', collapsed ? '1' : '0'); } catch (e) { }
    if (!collapsed && window.RobotSim && window.RobotSim.redraw) window.RobotSim.redraw();
}

// เปิด/ปิดท่าไอเดิลของหุ่น (ทั้งซิมและหุ่นจริงผ่าน /run?cmd=!idle 1 หรือ !idle 0)
function toggleRobotIdle() {
    if (!window.RobotSim || !window.RobotSim.toggleIdle) return;
    window.RobotSim.toggleIdle();
    if (window.SFX) SFX.click();
}

// จำสถานะย่อ/กางไว้ + บนจอแคบให้เริ่มแบบย่อ เพื่อไม่ให้บังกระดานตั้งแต่เปิดมา
(function restoreTwinPanelState() {
    function apply() {
        var panel = document.getElementById('twin-panel');
        if (!panel) return;
        var saved = null;
        try { saved = localStorage.getItem('meto_twin_collapsed'); } catch (e) { }
        var shouldCollapse = saved === '1' || (saved === null && window.innerWidth <= 820);
        if (shouldCollapse) {
            panel.classList.add('twin-collapsed');
            var icon = document.getElementById('twin-toggle-icon');
            if (icon) icon.textContent = 'unfold_more';
            panel.title = 'กดเพื่อกางจอหุ่น';
        }
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', apply);
    } else { apply(); }
})();

// ลากบล็อกไปทิ้งถังขยะ — เดิมพังเพราะอ่าน Blockly.selected เหมือนกัน
function handleTrashDrop(e) {
    // เช็คว่ามีบล็อกถูกเลือกอยู่ไหม (ปกติเวลาลาก บล็อกพึ่งถูกเลือก)
    var selectedBlock = getTargetBlock();
    if (!selectedBlock) return;

    // ดึงตำแหน่งเมาส์/นิ้ว
    var x = e.clientX;
    var y = e.clientY;
    if (!x && e.changedTouches && e.changedTouches.length > 0) {
        x = e.changedTouches[0].clientX;
        y = e.changedTouches[0].clientY;
    }

    // ดึงตำแหน่งปุ่มถังขยะ
    var trashBtn = document.getElementById('btn-trash');
    if (!trashBtn) return;
    var rect = trashBtn.getBoundingClientRect();

    // เช็คว่าตำแหน่งเมาส์อยู่ในกล่องถังขยะไหม
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        // ถ้าใช่ ให้ลบบล็อกนั้นทิ้ง
        if (window.SFX) SFX.sweep(600, 200, 0.12, 'square', 0, 0.4);
        selectedBlock.dispose(true);
        selectedBlock = null;

        // (Optional) อาจเพิ่มเสียงหรือ Animation เล็กน้อยที่นี่
        console.log("Block Deleted via Drop");
    }
}

// ผูก Event กับ Document เพื่อดักจับตอนปล่อยเมาส์ (ไม่ว่าจะอยู่บนบล็อกหรือปุ่ม)
document.addEventListener('mouseup', handleTrashDrop);
document.addEventListener('touchend', handleTrashDrop);



// ==================== Pre-Run Validation ====================

// นับจำนวนคำสั่งข้างใน loop (ใช้ประเมินว่าจะรันนานแค่ไหน)
function countInnerCommands(loopBlock) {
    var inner = loopBlock.getInputTargetBlock('DO');
    var count = 0;
    while (inner) { count++; inner = inner.getNextBlock(); }
    return count;
}

// เงื่อนไขนี้มีบล็อกตัวแปรอยู่ข้างในไหม (ไล่ลงไปทุกชั้น)
function hasVariableInside(block) {
    if (!block) return false;
    if (block.type === 'variables_get' || block.type === 'variables_set') return true;
    var children = block.getChildren(false);
    for (var i = 0; i < children.length; i++) {
        if (hasVariableInside(children[i])) return true;
    }
    return false;
}

function validateWorkspace() {
    var warnings = [];
    var topBlocks = workspace.getTopBlocks(false);

    // 1. ไม่มี START PROGRAM
    var hasStart = topBlocks.some(function (b) { return b.type === 'start_program'; });
    if (!hasStart && topBlocks.length > 0) {
        warnings.push("ต้องแก้: ไม่มีบล็อก START PROGRAM หุ่นยนต์จะไม่รู้ว่าเริ่มจากตรงไหน");
    }

    // 2. มีบล็อกลอย (ไม่ต่อกับ START)
    var floatingCount = 0;
    for (var i = 0; i < topBlocks.length; i++) {
        if (topBlocks[i].type !== 'start_program') floatingCount++;
    }
    if (hasStart && floatingCount > 0) {
        warnings.push("ต้องแก้: มี " + floatingCount + " กลุ่มบล็อกลอยไม่ต่อ START จะไม่ถูกรัน");
    }

    // 3-7. ตรวจบล็อกทั้งหมด
    var allBlocks = workspace.getAllBlocks(false);
    var cmdSequence = [];

    for (var i = 0; i < allBlocks.length; i++) {
        var b = allBlocks[i];

        // 3. loop/while ว่าง
        if (b.type === 'controls_repeat_ext' || b.type === 'controls_whileUntil' || b.type === 'controls_forever') {
            if (!b.getInputTargetBlock('DO')) {
                warnings.push("ต้องแก้: มี " + (b.type === 'controls_repeat_ext' ? 'repeat' : (b.type === 'controls_forever' ? 'repeat forever' : 'while')) + " ว่าง ไม่มีคำสั่งข้างใน");
            }
        }

        // 4. if ไม่มีเงื่อนไข
        if (b.type === 'controls_if') {
            if (!b.getInputTargetBlock('IF0')) {
                warnings.push("ต้องแก้: บล็อก if ไม่มีเงื่อนไข จะถูกข้ามเสมอ");
            }
        }

        // 5. repeat 0 / 1 / มากเกินไป
        if (b.type === 'controls_repeat_ext') {
            var tb = b.getInputTargetBlock('TIMES');
            if (tb && tb.type === 'math_number') {
                var n = parseInt(tb.getFieldValue('NUM'));
                if (n === 0) warnings.push("ต้องแก้: repeat 0 ครั้ง จะไม่ทำอะไรเลย");
                if (n === 1) warnings.push("คำแนะนำ: repeat 1 ครั้ง ไม่จำเป็นต้องใช้ loop");
                // หุ่นทำทีละคำสั่งห่างกัน 0.6 วิ → repeat เยอะ = รอเป็นสิบนาที
                // เดิมไม่มีเพดาน: repeat 1000 กับบล็อก 5 อัน = 5,000 คำสั่ง = 50 นาที
                if (n > 50) {
                    var inner = countInnerCommands(b);
                    var mins = Math.round(n * Math.max(inner, 1) * 0.6 / 60);
                    warnings.push("ต้องแก้: repeat " + n + " ครั้ง หุ่นจะทำงานประมาณ " + mins +
                        " นาที กดหยุดได้ตลอด แต่ลองลดจำนวนลงก่อนไหม?");
                }
            }
        }

        // 5.1 (เดิม) เตือนว่าเงื่อนไขที่มีตัวแปรใช้ไม่ได้ — ตอนนี้ MetoRunner คิดค่าตัวแปรตอนรันจริงแล้ว จึงเลิกเตือน

        // 5.2 if/while ที่ไม่มีบล็อกในช่องเงื่อนไขของ while
        if (b.type === 'controls_whileUntil' && !b.getInputTargetBlock('BOOL')) {
            warnings.push("ต้องแก้: บล็อก while ไม่มีเงื่อนไข จะไม่ทำงานเลย");
        }

        // สะสม command ที่ต่อกับ start (สำหรับเช็คซ้ำ)
        if (BLOCK_LABELS[b.type]) {
            cmdSequence.push(BLOCK_LABELS[b.type]);
        }
    }

    // 6. คำสั่งแขน/มือไม่มี delay คั่น
    var armHandTypes = ['arm_left_close', 'arm_left_normal', 'arm_left_open', 'arm_right_close', 'arm_right_normal', 'arm_right_open',
        'hand_left_down', 'hand_left_center', 'hand_left_up', 'hand_right_down', 'hand_right_center', 'hand_right_up'];
    for (var i = 0; i < allBlocks.length; i++) {
        var b = allBlocks[i];
        if (armHandTypes.indexOf(b.type) !== -1) {
            var next = b.getNextBlock();
            if (next && armHandTypes.indexOf(next.type) !== -1) {
                warnings.push("คำแนะนำ: คำสั่งแขน/มือต่อกันไม่มี delay อาจเร็วเกินจนมองไม่เห็น");
                break; // แจ้งแค่ครั้งเดียว
            }
        }
    }

    // 7. คำสั่งซ้ำ 3+ ครั้ง → แนะนำ loop
    if (cmdSequence.length >= 4) {
        for (var i = 0; i < cmdSequence.length - 2; i++) {
            if (cmdSequence[i] === cmdSequence[i + 1] && cmdSequence[i + 1] === cmdSequence[i + 2]) {
                warnings.push("คำแนะนำ: มี \"" + cmdSequence[i] + "\" ซ้ำหลายครั้ง ลองใช้ repeat block แทน");
                break;
            }
        }
    }

    return warnings;
}

// ฟังก์ชันส่งคำสั่ง (Run Code) — ตรวจ error ก่อนรัน
async function runCode() {
    // 1. Find the "Start" block
    var topBlocks = workspace.getTopBlocks(false);
    var startBlock = null;

    for (var i = 0; i < topBlocks.length; i++) {
        if (topBlocks[i].type == 'start_program') {
            startBlock = topBlocks[i];
            break;
        }
    }

    if (!startBlock) {
        // รันไม่ได้เลย = กล่องเด้ง (บัคทั่วไประหว่างรันเป็นแค่โน้ตเล็ก ดู metoNoteBug)
        metoAlert('ยังไม่มีบล็อก START', 'ลากบล็อก START PROGRAM มาวาง แล้วต่อบล็อกใต้มันก่อนนะ');
        return;
    }

    // 2. ตรวจ error ก่อนรัน
    var warnings = validateWorkspace();
    var hasError = warnings.some(function (w) { return w.startsWith("ต้องแก้"); });
    if (warnings.length > 0) {
        // เสียงต่ำและนุ่ม ตั้งใจไม่ให้ฟังเหมือนถูกดุ (THEME.md ข้อ 9 ห้ามลงโทษเด็ก)
        if (window.SFX) SFX.nope();
        if (window.robotReact) window.robotReact('confused');
        // แสดง warning ใน chat (แบบไลฟ์)
        addChatBubble("ตรวจพบ:\n" + warnings.join("\n"), "system-auto");

        // ถามในธีมว่าจะรันต่อไหม (เดิมเป็น confirm() กล่องเทาของระบบ)
        if (hasError) {
            var go = await askInTheme({
                title: 'เจอบางอย่างในโค้ด',
                body: warnings.map(function (w) { return '<div>' + w + '</div>'; }).join(''),
                cancelText: 'กลับไปแก้',
                okText: 'รันเลย'
            });
            if (!go) return;
        }
    }

    // กันกด Run ซ้อนตอนโปรแกรมเดิมยังไม่จบ
    if (window.isSimRunning && window.isSimRunning()) return;

    // 3. สร้างสตริงคำสั่งของสายที่ต่อกับ START (MetoRunner — คิดค่าตัวแปรและสูตรได้จริง)
    //    โปรแกรมที่มีบล็อกเซนเซอร์: สตริงนี้ใช้แค่บันทึก (เซนเซอร์ถือว่าเท็จ) ตัวรันจริงจะอ่าน /state ระหว่างรัน
    var usesSensors = MetoRunner.usesSensors(startBlock);
    var command;
    try {
        command = await MetoRunner.compile(startBlock);
    } catch (e) {
        // วนซ้อนกันจนเกิน 20,000 ขั้น (เช่น repeat 1000 ใน repeat 1000) — เดิมจะได้สตริงยาวหลายแสนตัวอักษร
        metoAlert('โปรแกรมยาวเกินไป', 'โปรแกรมนี้ยาวเกินไปสำหรับหุ่น ลองลดจำนวนรอบของ repeat ลงหน่อยนะ');
        return;
    }

    // เดิมเด้ง alert() โชว์ protocol ดิบ (เช่น "w;a;") ใส่หน้าเด็กทุกครั้งที่กด Run
    // alert() หยุด JS thread ทั้งหมด → แช่ rAF loop ของ robot-sim ค้างจนกว่าจะกด OK
    // ความรู้สึกที่ได้คือ "กดแล้วไม่มีอะไรเกิดขึ้น" ในจังหวะที่ควรตื่นเต้นที่สุด
    console.log('[RUN] command =', command);

    // เคยต่อหุ่นจริงแล้วตอนนี้หลุด = เด็กตั้งใจรันกับหุ่นจริง → ถามก่อน ไม่ใช่รันแต่ในจอเงียบ ๆ
    var liveNow = window.RobotSim && RobotSim.isLive && RobotSim.isLive();
    if (window.metoHadLive && !liveNow) {
        var simOnly = await askInTheme({
            title: 'หุ่นจริงหลุดการเชื่อมต่อ',
            body: 'ตอนนี้หาหุ่นในเครือข่ายไม่เจอ<br>เช็กว่าหุ่นเปิดอยู่และต่อฮอตสปอตเดียวกัน',
            cancelText: 'รอต่อหุ่นก่อน',
            okText: 'รันในจอจำลอง'
        });
        if (!simOnly) {
            if (window.RobotSim && RobotSim.checkNow) RobotSim.checkNow();
            return;
        }
    }
    if (window.SFX) SFX.sweep(300, 900, 0.18);
    if (typeof ProjectStore !== 'undefined' && ProjectStore._toast) {
        ProjectStore._toast('เริ่มรันแล้ว! ดูหุ่นที่จอจำลองเลย', 'success');
    }
    // ไม่มีเซนเซอร์ = ทั้งก้อนเป็นช่วงเดียว · มีเซนเซอร์ = ทีละช่วง (ส่ง → รอหุ่นว่าง → อ่าน /state → ตัดสิน)
    // ทั้งสองแบบผ่าน MetoRunner: รอ 409 BUSY จริง ดูบัค (bugN) และอ่านผลจบ (prog) จากหุ่น
    if (usesSensors && !liveNow) {
        addChatBubble("ยังไม่ได้ต่อหุ่นจริง บล็อกเซนเซอร์จะใช้ค่าจากจอจำลอง " +
            "(ขอบโต๊ะ = ขอบเวที · ถือของ = หลังสั่ง Grab)", "system-auto");
    }
    MetoRunner.run(startBlock).then(function (r) {
        if (r) console.log('[RUN] รันจบ', r);
    });

    // 5. Log activity for dashboard
    // had_errors ถูกเก็บลง log ด้วย — เซิร์ฟเวอร์ใช้ตัดสินทักษะ Debugging จาก log ของตัวเอง
    var blockCount = workspace ? workspace.getAllBlocks(false).length : 0;
    logActivity('RUN_CODE', {
        command_length: command.length,
        block_count: blockCount,
        had_errors: hasError,
    });
    logActivity('BLOCK_COUNT', { count: blockCount });

    // 5.1 เหตุการณ์แบบละเอียดสำหรับเล่มวิจัย (ข้อ 4.7)
    // correlation_id เดียวกัน = มาจากการกด Run ครั้งเดียวกัน
    var runCorrelation = MetoEvents.newCorrelationId();
    var blockTypes = {};
    if (workspace) {
        workspace.getAllBlocks(false).forEach(function (b) {
            blockTypes[b.type] = (blockTypes[b.type] || 0) + 1;
        });
    }
    MetoEvents.record('program.executed', {
        block_count: blockCount,
        block_types: blockTypes,
        code_length: command.length,
        had_errors: hasError,
        error_codes: warnings.filter(function (w) { return w.startsWith('ต้องแก้'); }),
        hint_count: warnings.length - warnings.filter(function (w) { return w.startsWith('ต้องแก้'); }).length,
    }, { correlationId: runCorrelation, subjectType: 'project',
         subjectId: (typeof ProjectStore !== 'undefined' ? ProjectStore.currentId : null) });

    // error ที่ระบบตรวจเจอ — เดิมแสดงในแชทแล้วทิ้งทันที ไม่เคยถูกบันทึกเลย
    if (warnings.length > 0) {
        MetoEvents.record('errors.detected', {
            messages: warnings.slice(0, 10),
            blocking: hasError,
        }, { correlationId: runCorrelation });
    }

    // 6. Skill auto-detect — นับเฉพาะรันที่ "สะอาด" (ไม่มีข้อ "ต้องแก้" เลย)
    // ข้อ "คำแนะนำ" ไม่ถือเป็น error — ตามเงื่อนไข: รันถูกโดยไม่ขึ้นเออเร่อจึงนับว่าเรียนรู้
    if (!hasError) {
        reportSkillsUsed();
    }
}

// ==================== Skill Auto-Detect ====================
// ส่ง "ผังบล็อกจริง" ไปให้เซิร์ฟเวอร์อ่านเอง แล้วเซิร์ฟเวอร์เป็นผู้ตัดสินว่าใช้ทักษะอะไร
// (1 รันสะอาด = กำลังเรียน, 3 รันสะอาด = เชี่ยวชาญ — ฝั่งเซิร์ฟเวอร์เป็นผู้นับ)
//
// เดิมหน้าเว็บเป็นคนตัดสินแล้วส่งรายชื่อทักษะไป ซึ่งปลอมได้ด้วย developer tools
// ตอนนี้ /api/skills/auto ไม่รับรายชื่อทักษะอีกแล้ว — ดู skills.py

function currentWorkspaceXml() {
    if (!workspace || typeof Blockly === 'undefined') return null;
    try {
        return Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(workspace));
    } catch (e) {
        console.warn('[Skills] แปลง workspace เป็น XML ไม่ได้:', e.message);
        return null;
    }
}

function reportSkillsUsed() {
    if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) return;

    var xml = currentWorkspaceXml();
    if (!xml) return;

    fetch('/api/skills/auto', {
        method: 'POST',
        headers: Auth.getHeaders(),
        body: JSON.stringify({ blockly_xml: xml })
    }).then(function (res) { return res.ok ? res.json() : null; })
        .then(function (data) {
            if (!data) return;
            if (data.newly_unlocked_faces && data.newly_unlocked_faces.length) {
                announceNewFaces(data.newly_unlocked_faces);
            }
            if (data.results) celebrateStarsHere(data.results);
        })
        .catch(function () { /* เงียบ — ไม่รบกวนการเล่น */ });
}

// ---------- ปลดล็อกหน้าหุ่น ----------
// ของสะสมต้องเป็น "รูป" ไม่ใช่ตัวเลข — เด็กเอาหน้าหุ่นไปอวดเพื่อนได้ เอา "72%" ไปอวดไม่ได้
// ปลดล็อกด้วยการใช้บล็อกหน้านั้นในงานที่รันจริง ไม่ใช่ซื้อ ไม่ใช่สุ่ม
// หน้าทั้ง 11 แบบวาดด้วยโค้ดอยู่แล้วใน robot-sim.js — ไม่ต้องวาดอาร์ตใหม่สักชิ้น
var FACE_LABELS = {
    face_normal: 'ปกติ', face_look_left: 'เหลือบซ้าย', face_look_right: 'เหลือบขวา',
    face_happy: 'ยิ้ม', face_sad: 'เศร้า', face_angry: 'โมโห',
    face_shocked: 'ตกใจ', face_sleepy: 'ง่วง', face_confused: 'งง',
    face_love: 'รัก', face_shy: 'เขิน'
};

function announceNewFaces(keys) {
    var names = keys.map(function (k) { return FACE_LABELS[k] || k; });
    if (window.SFX) SFX.unlock();
    if (window.robotReact) window.robotReact('love');
    if (typeof addChatBubble === 'function') {
        addChatBubble('ปลดล็อกหน้าใหม่: ' + names.join(' · ') +
            'เลือกเป็นรูปโปรไฟล์ได้ที่แดชบอร์ด', 'system-auto');
    }
}

// ---------- ฉลองตรงที่เด็กทำสำเร็จ ----------
// เดิมการฉลอง (จอมืด + ดาวพุ่ง + อนุภาค + จอสั่น + เสียงแฟนแฟร์) เขียนไว้ครบใน
// dashboard-player.js แต่ถูกเรียกจาก _renderProfile() ที่เข้าไม่ถึงแล้ว → เป็น dead code
// และต่อให้เรียกได้ มันก็ฉลองตอน "โหลดหน้าแดชบอร์ด" ไม่ใช่ตอนเด็กทำสำเร็จ
// ระยะห่างระหว่าง "ทำได้" กับ "ได้รางวัล" คือหัวใจของความรู้สึกสนุก — ย้ายมาไว้ที่ Workspace

function _wsStarKey() {
    var uid = (typeof Auth !== 'undefined' && Auth.user && Auth.user.id) || 'guest';
    return 'meto_ws_stars_' + uid;
}

function celebrateStarsHere(results) {
    var previous = null;
    try { previous = JSON.parse(localStorage.getItem(_wsStarKey()) || 'null'); } catch (e) { }

    var current = {};
    results.forEach(function (r) { current[r.name] = r.clean_runs || 0; });
    try { localStorage.setItem(_wsStarKey(), JSON.stringify(current)); } catch (e) { }

    // ครั้งแรกที่เข้ามาไม่เด้ง ไม่งั้นจะรัวทุกดาวที่มีอยู่ก่อนแล้ว
    if (!previous) return;

    var gained = results.filter(function (r) {
        return (current[r.name] || 0) > (previous[r.name] || 0);
    });
    if (!gained.length) return;

    var count = gained.reduce(function (sum, r) {
        return sum + ((current[r.name] || 0) - (previous[r.name] || 0));
    }, 0);
    var names = gained.map(function (r) { return r.name; });
    var levelUp = gained.some(function (r) { return r.newly_completed; });

    if (window.robotReact) window.robotReact('love');
    if (typeof Dashboard !== 'undefined' && Dashboard._starCelebration) {
        Dashboard._starCelebration(names, count, levelUp);
    } else {
        // ไม่มี Dashboard ก็อย่างน้อยให้มีเสียงกับข้อความ
        if (window.SFX) (levelUp ? SFX.skillComplete() : SFX.star());
        addChatBubble('ได้ดาวเพิ่ม ' + count + ' ดวง! (' + names.join(', ') + ')', 'system-auto');
    }
}

// Simulation Logic — now handled by robot-sim.js

function sendToRobot(cmd) {
    // เปลี่ยน IP ให้ตรงกับหุ่นยนต์
    var ip = "MDTrobot.local";  // mDNS — ไม่ต้องจำ IP
    if (window.RobotLog) RobotLog.add('SEND', 'ส่งคำสั่งไปหุ่นจริง', { cmd: cmd });
    fetch(`http://${ip}/run?cmd=${encodeURIComponent(cmd)}`)
        .then(response => {
            if (response.status === 409) {
                // BUSY = ยังทำคิวเดิมอยู่ คำสั่งนี้ไม่ได้เข้าคิว (เดิมนับว่ารับแล้ว)
                if (window.RobotLog) RobotLog.add('SEND', 'หุ่นจริงไม่รับคำสั่ง (409 ยังไม่ว่าง)');
                metoNote('หุ่นยังทำงานเดิมอยู่ เลยยังไม่รับโปรแกรมนี้ รอให้หยุดแล้วกด Run ใหม่นะ');
                return;
            }
            console.log("Sent!");
            if (window.RobotLog) RobotLog.add('SEND', 'หุ่นจริงรับคำสั่งแล้ว (HTTP ' + response.status + ')');
        })
        .catch(error => {
            // ไม่มีหุ่นในเครือข่ายเป็นเรื่องปกติ (ห้องเรียนส่วนใหญ่รันแค่ซิม) — เตือนเบา ๆ ไม่ใช่ error แดง
            console.warn("[SEND] ส่งไม่ถึงหุ่นจริง:", error.message);
            if (window.RobotLog) RobotLog.add('SEND', 'ส่งไม่ถึงหุ่นจริง รันเฉพาะในซิม (' + error.message + ')');
        });
}

/* Connection Status*/
// ยิงหาหุ่นถี่แค่ไหน — ถอยเป็นขั้นบันไดเมื่อหาไม่เจอติดกัน
//
// เดิมเป็น setInterval(checkConnection, 2500) ตายตัว วัดจริงได้ 57 request
// ใน 145 วินาที ทุกอันพัง ERR_NAME_NOT_RESOLVED เพราะไม่มีหุ่นในเครือข่าย
// ห้องจริงมีหุ่นไม่กี่ตัวแต่เด็ก 40 คน เครื่องส่วนใหญ่จึงยิงเปล่าทั้งคาบ
// console เละจนหา error จริงไม่เจอ (ฝั่ง /state ใน robot-sim.js แก้ไปแล้ว
// แต่เส้นนี้เป็นคนละทาง เลยหลุดมา)
//
// ต่อติดแล้วกลับมาถี่ 2.5 วิเหมือนเดิม เสียบหุ่นใหม่จะเจอภายในครึ่งนาที
var connFails = 0;
var connTimer = null;

function connIntervalMs() {
    if (connFails >= 20) return 30000;
    if (connFails >= 10) return 15000;
    if (connFails >= 5) return 8000;
    if (connFails >= 3) return 5000;
    return 2500;
}

function scheduleConnectionCheck() {
    clearTimeout(connTimer);
    connTimer = setTimeout(checkConnection, connIntervalMs());
}

function checkConnection() {
    var ip = "MDTrobot.local";  // mDNS — ไม่ต้องจำ IP
    var dot = document.getElementById('status-dot');
    var text = document.getElementById('status-text');

    // Fetch without cmd just to ping (Robo.ino returns 400 Empty which is a success response for connectivity)
    fetch(`http://${ip}/run`, { method: 'GET', mode: 'cors' })
        .then(response => {
            // If we get ANY response (even 400), it means we found the server
            connFails = 0;
            logConnectionChange('online');
            if (dot) dot.className = 'online';
            if (text) text.textContent = "หุ่นจริง";
        })
        .catch(error => {
            // Timeout or Network Error
            connFails++;
            logConnectionChange('offline');
            if (dot) dot.className = 'offline';
            // 9 พ.ย. 2569: เดิม "Offline" สีแดง ผู้ทดสอบนึกว่าเว็บพัง · บอกว่ามีหุ่นจำลองให้ฝึกได้เลย
            if (text) text.textContent = "หุ่นจำลอง (ฝึกบนจอได้เลย)";
        })
        .finally(scheduleConnectionCheck);
}

// กดปุ่มตรวจเอง = ถามทันที ไม่ต้องรอจังหวะที่ถอยไปแล้ว
function checkConnectionNow() {
    connFails = 0;
    checkConnection();
}

// บันทึกลง log เฉพาะตอนสถานะเปลี่ยน (ไม่สแปมทุก 2.5 วิ)
var lastConnState = null;
function logConnectionChange(state) {
    if (state === lastConnState) return;
    lastConnState = state;
    if (window.RobotLog) {
        RobotLog.add('CONN', state === 'online'
            ? 'พบหุ่นจริงบนเครือข่าย (MDTrobot.local)'
            : 'ไม่พบหุ่นจริง ทำงานในโหมดจำลอง');
    }
}

// ตั้งรอบถัดไปจากผลลัพธ์ของรอบก่อน (setTimeout ต่อกัน) ไม่ใช่ setInterval ตายตัว
// setInterval จะยิงซ้อนตอนเครือข่ายช้า เพราะไม่รอให้รอบก่อนตอบกลับ
checkConnection();


// ==================== Block Tree Description ====================

var BLOCK_LABELS = {
    'start_program': 'START PROGRAM',
    'move_forward': 'forward', 'move_backward': 'backward',
    'turn_left': 'left', 'turn_right': 'right',
    'wait_one_sec': 'delay 1 sec',
    'arm_left_close': 'Left Arm: Up', 'arm_left_normal': 'Left Arm: Middle', 'arm_left_open': 'Left Arm: Down',
    'arm_right_close': 'Right Arm: Up', 'arm_right_normal': 'Right Arm: Middle', 'arm_right_open': 'Right Arm: Down',
    // ชื่อชนิด hand_left_* ส่งคำสั่ง 1/2/3 ซึ่งเป็นมือขวาจริง (ดูหมายเหตุที่นิยามบล็อก)
    'hand_left_down': 'Right Hand: กาง', 'hand_left_center': 'Right Hand: กลาง', 'hand_left_up': 'Right Hand: หนีบ',
    'hand_right_down': 'Left Hand: หนีบ', 'hand_right_center': 'Left Hand: กลาง', 'hand_right_up': 'Left Hand: กาง',
    'head_turn_right': 'Head: Turn Right', 'head_center': 'Head: Center', 'head_turn_left': 'Head: Turn Left',
    'face_normal': 'Face: Normal', 'face_look_left': 'Face: Look Left', 'face_look_right': 'Face: Look Right',
    'face_happy': 'Face: Happy', 'face_sad': 'Face: Sad', 'face_angry': 'Face: Angry',
    'face_shocked': 'Face: Shocked', 'face_sleepy': 'Face: Sleepy', 'face_confused': 'Face: Confused',
    'face_love': 'Face: Love', 'face_shy': 'Face: Shy',
    'grip_smart': 'Grip: Smart Grab', 'grip_release': 'Grip: Release',
    'grip_verify': 'Grip: Grab & Lift', 'grip_percent': 'Grip: N%',
    // บล็อกใหม่ (เฟิร์มแวร์ 6 พ.ย.) — describeBlock ใช้ข้อความจริงบนบล็อก (รวมตัวเลข) แทนชื่อนี้
    'move_timed': 'forward/backward for N ms', 'turn_timed': 'turn left/right for N ms', 'move_stop': 'stop',
    'arm_lift': 'Arm lift to N°', 'hand_grip_pct': 'Hand หนีบ N%',
    'head_yaw': 'Head: turn to N°', 'head_tilt': 'Head: tilt N°', 'head_speed': 'Head speed N°/s',
    'face_emotion': 'Emotion (ตา + ท่าทาง)', 'wait_ms': 'wait N ms',
    // รอบ #501
    'motion_home': 'rest pose', 'motion_back': 'go back to start',
    'grip_failback': 'Grip: if grab fails, go back',
    'sensor_object': 'object in front?', 'sensor_touch': 'head touched?'
};

// บล็อกที่มีตัวเลข/ตัวเลือก — บอก AI ด้วยข้อความเต็มบนบล็อก เช่น "Head: turn to 30 °"
function blockText(block) {
    try { return block.toString(); } catch (e) { return BLOCK_LABELS[block.type] || block.type; }
}

function describeBlock(block, indent) {
    if (!block) return '';
    indent = indent || '';
    var type = block.type;
    var label = BLOCK_LABELS[type] || type;
    var lines = [];

    if (type === 'controls_repeat_ext') {
        var times = '?';
        var tb = block.getInputTargetBlock('TIMES');
        if (tb && tb.type === 'math_number') times = tb.getFieldValue('NUM');
        lines.push(indent + 'repeat ' + times + ' times {');
        var doB = block.getInputTargetBlock('DO');
        if (doB) lines.push(describeChain(doB, indent + '  '));
        lines.push(indent + '}');
    } else if (type === 'controls_whileUntil') {
        var mode = block.getFieldValue('MODE');
        var wc = block.getInputTargetBlock('BOOL');
        lines.push(indent + mode.toLowerCase() + ' (' + (wc ? blockText(wc) : '...') + ') {');
        var doB = block.getInputTargetBlock('DO');
        if (doB) lines.push(describeChain(doB, indent + '  '));
        lines.push(indent + '}');
    } else if (type === 'controls_forever') {
        lines.push(indent + 'repeat forever {');
        var doF = block.getInputTargetBlock('DO');
        if (doF) lines.push(describeChain(doF, indent + '  '));
        lines.push(indent + '}');
    } else if (type === 'controls_if') {
        var ic = block.getInputTargetBlock('IF0');
        lines.push(indent + 'if (' + (ic ? blockText(ic) : '...') + ') {');
        var doB = block.getInputTargetBlock('DO0');
        if (doB) lines.push(describeChain(doB, indent + '  '));
        lines.push(indent + '}');
        for (var ei = 1; ei <= (block.elseifCount_ || 0); ei++) {
            var ec = block.getInputTargetBlock('IF' + ei);
            lines.push(indent + 'else if (' + (ec ? blockText(ec) : '...') + ') {');
            var eb = block.getInputTargetBlock('DO' + ei);
            if (eb) lines.push(describeChain(eb, indent + '  '));
            lines.push(indent + '}');
        }
        var elB = block.getInputTargetBlock('ELSE');
        if (elB) {
            lines.push(indent + 'else {');
            lines.push(describeChain(elB, indent + '  '));
            lines.push(indent + '}');
        }
    } else if (type === 'variables_set') {
        var vn = '?'; try { vn = block.getField('VAR').getText(); } catch (e) { }
        lines.push(indent + 'set variable "' + vn + '" = ...');
    } else if (type === 'variables_get') {
        var vn = '?'; try { vn = block.getField('VAR').getText(); } catch (e) { }
        lines.push(indent + 'get variable "' + vn + '"');
    } else if (type === 'delay_sec') {
        var sb = block.getInputTargetBlock('SEC');
        var sec = sb && sb.type === 'math_number' ? sb.getFieldValue('NUM') : '?';
        lines.push(indent + 'Wait ' + sec + ' sec');
    } else if (METO_CMD[type] || type === 'math_change') {
        lines.push(indent + blockText(block));
    } else {
        lines.push(indent + label);
    }
    return lines.join('\n');
}

function describeChain(block, indent) {
    indent = indent || '';
    var parts = [];
    var cur = block;
    while (cur) {
        parts.push(describeBlock(cur, indent));
        cur = cur.getNextBlock();
    }
    return parts.join('\n');
}

function describeWorkspace() {
    var topBlocks = workspace.getTopBlocks(true);
    if (topBlocks.length === 0) return '';
    var groups = [];
    for (var i = 0; i < topBlocks.length; i++) {
        var b = topBlocks[i];
        var isStart = (b.type === 'start_program');
        var header = isStart ? 'START PROGRAM' : '(บล็อกลอย)';
        var chain = describeChain(b, '  ');
        groups.push('[กลุ่ม ' + (i + 1) + '] ' + header + ':\n' + chain);
    }
    return groups.join('\n\n');
}

// ==================== Real-time Block Warnings ====================

function updateBlockWarnings() {
    var allBlocks = workspace.getAllBlocks(false);
    var armHandTypes = ['arm_left_close', 'arm_left_normal', 'arm_left_open', 'arm_right_close', 'arm_right_normal', 'arm_right_open',
        'hand_left_down', 'hand_left_center', 'hand_left_up', 'hand_right_down', 'hand_right_center', 'hand_right_up'];

    for (var i = 0; i < allBlocks.length; i++) {
        var b = allBlocks[i];
        var warn = null;

        if (b.type === 'controls_repeat_ext' || b.type === 'controls_whileUntil' || b.type === 'controls_forever') {
            if (!b.getInputTargetBlock('DO')) {
                warn = 'ยังไม่มีคำสั่งข้างใน ลองใส่บล็อกเข้าไปในช่อง do';
            }
        }

        if (b.type === 'controls_repeat_ext') {
            var tb = b.getInputTargetBlock('TIMES');
            if (tb && tb.type === 'math_number') {
                var n = parseInt(tb.getFieldValue('NUM'));
                if (n === 0) warn = 'repeat 0 ครั้ง จะไม่ทำอะไรเลย';
            }
        }

        if (b.type === 'controls_if') {
            if (!b.getInputTargetBlock('IF0')) {
                warn = 'ยังไม่มีเงื่อนไข ลองใส่ true/false หรือตัวเปรียบเทียบ';
            }
        }

        if (armHandTypes.indexOf(b.type) !== -1) {
            var next = b.getNextBlock();
            if (next && armHandTypes.indexOf(next.type) !== -1) {
                warn = 'คำสั่งต่อกันไม่มี delay อาจเร็วเกินจนมองไม่เห็น';
            }
        }

        b.setWarningText(warn);
    }
}

// ==================== AI Debounce Analysis ====================

var AI_SERVER_URL = window.location.origin;
var aiDebounceTimer = null;
var hasUserInteracted = false;
var isAnalyzing = false;
var lastAnalyzedCode = "";
var aiSessionId = "default";

// ผู้ช่วย AI ต้องล็อกอินก่อน — endpoint ฝั่งเซิร์ฟเวอร์บังคับ JWT
function aiIsAvailable() {
    return typeof Auth !== 'undefined' && Auth.isLoggedIn();
}

function aiHeaders() {
    return (typeof Auth !== 'undefined')
        ? Auth.getHeaders()
        : { "Content-Type": "application/json" };
}

// ขอ session ใหม่จากเซิร์ฟเวอร์ — เรียกซ้ำได้ (ใช้ตอนล็อกอินสำเร็จด้วย)
async function refreshAISession() {
    if (!aiIsAvailable()) {
        aiSessionId = "default";
        console.log("[AI] ยังไม่ได้เข้าสู่ระบบ ผู้ช่วย AI ปิดอยู่");
        return;
    }
    try {
        var res = await fetch(AI_SERVER_URL + "/new_session", {
            method: "POST",
            headers: aiHeaders()
        });
        var data = await res.json();
        if (data.session_id) {
            aiSessionId = data.session_id;
            console.log("[AI] 🆔 Session created:", aiSessionId);
        }
    } catch (e) {
        console.warn("[AI] ไม่สามารถสร้าง session:", e.message);
    }
}

// สร้าง session + attach change listener (called from initWorkspace)
async function initAISession() {
    await refreshAISession();

    // Attach workspace change listener
    if (workspace) {
        workspace.addChangeListener(function (event) {
            if (event.isUiEvent) return;
            var validTypes = [
                Blockly.Events.BLOCK_CREATE,
                Blockly.Events.BLOCK_DELETE,
                Blockly.Events.BLOCK_CHANGE,
                Blockly.Events.BLOCK_MOVE
            ];
            if (validTypes.indexOf(event.type) === -1) return;

            // Real-time warnings บนบล็อก
            updateBlockWarnings();

            // บันทึกว่าเด็กลาก/ลบ/แก้บล็อกอะไร (ข้อ 4.7)
            // แผนระบุว่านี่คือเหตุการณ์ที่ "ขาดมากที่สุด" — เห็นกระบวนการคิด ไม่ใช่แค่ผลลัพธ์
            recordBlockChange(event);

            hasUserInteracted = true;
            if (aiDebounceTimer) clearTimeout(aiDebounceTimer);
            aiDebounceTimer = setTimeout(function () {
                analyzeCurrentCode();
            }, 5000);
        });
    }
}

// แปลงเหตุการณ์ของ Blockly เป็นชื่อกริยาที่อ่านรู้เรื่องตอนทำสถิติ
var BLOCK_EVENT_OPS = {};
function blockEventOp(eventType) {
    if (!Object.keys(BLOCK_EVENT_OPS).length && typeof Blockly !== 'undefined') {
        BLOCK_EVENT_OPS[Blockly.Events.BLOCK_CREATE] = 'create';
        BLOCK_EVENT_OPS[Blockly.Events.BLOCK_DELETE] = 'delete';
        BLOCK_EVENT_OPS[Blockly.Events.BLOCK_CHANGE] = 'change';
        BLOCK_EVENT_OPS[Blockly.Events.BLOCK_MOVE] = 'move';
    }
    return BLOCK_EVENT_OPS[eventType] || String(eventType);
}

function recordBlockChange(event) {
    if (typeof MetoEvents === 'undefined') return;
    try {
        var block = (event.blockId && workspace) ? workspace.getBlockById(event.blockId) : null;
        // บล็อกที่เพิ่งถูกลบหาไม่เจอแล้ว — ใช้ชนิดที่ติดมากับ event แทน
        var blockType = (block && block.type) || event.oldValue || event.newValue || null;

        MetoEvents.record('workspace.block_changed', {
            op: blockEventOp(event.type),
            block_type: (typeof blockType === 'string') ? blockType : null,
            workspace_size: workspace ? workspace.getAllBlocks(false).length : 0,
        }, {
            subjectType: 'project',
            subjectId: (typeof ProjectStore !== 'undefined' ? ProjectStore.currentId : null),
        });
    } catch (e) { /* เก็บสถิติไม่ได้ ต้องไม่รบกวนการลากบล็อก */ }
}

// ส่งโค้ดปัจจุบันไป AI วิเคราะห์
async function analyzeCurrentCode() {
    // Guard: ยังไม่เคยใช้งานจริง
    if (!hasUserInteracted) return;

    // Guard: กำลังวิเคราะห์อยู่
    if (isAnalyzing) return;

    // Guard: ยังไม่ล็อกอิน — เซิร์ฟเวอร์จะตอบ 401 อยู่ดี ไม่ต้องยิงให้เปลือง
    if (!aiIsAvailable()) return;

    // แปลงบล็อก → block tree description
    var description = "";
    try {
        description = describeWorkspace();
    } catch (e) {
        console.log("[AI] ไม่สามารถแปลงโค้ดได้:", e);
        return;
    }

    if (!description.trim() || description.trim() === lastAnalyzedCode) return;

    isAnalyzing = true;
    lastAnalyzedCode = description.trim();

    console.log("[AI] ส่ง block description:", description);

    try {
        var response = await fetch(AI_SERVER_URL + "/analyze", {
            method: "POST",
            headers: aiHeaders(),
            // ส่งบริบทของงานไปด้วย เพื่อให้ transcript บอกได้ว่าถามตอนงานอยู่สภาพไหน (ข้อ 4.1)
            body: JSON.stringify({
                code: description.trim(),
                session_id: aiSessionId,
                project_id: (typeof ProjectStore !== 'undefined' ? ProjectStore.currentId : null),
                blockly_xml: currentWorkspaceXml(),
            })
        });

        var data = await response.json();

        if (data.reply) {
            console.log("[AI] ผู้ช่วยสอน:", data.reply);
            addChatBubble(data.reply, "ai-auto");
        } else if (data.error) {
            console.warn("[AI] Auto-analysis error (dev only):", data.error);
            // ไม่แสดง error ให้ผู้เรียนเห็น — log ไว้ใน console เท่านั้น
        }
    } catch (error) {
        console.warn("[AI] Auto-analysis connection error (dev only):", error.message);
        // ไม่แสดง error ให้ผู้เรียนเห็น
    }

    isAnalyzing = false;
}

// ฟังก์ชันสำหรับถาม AI ด้วยตัวเอง (ใช้กับปุ่ม "ช่วยดูหน่อย" หรือ chat input)
async function askAI(question) {
    // ผู้ช่วย AI เปิดให้เฉพาะผู้ที่เข้าสู่ระบบแล้ว
    if (!aiIsAvailable()) {
        addChatBubble("เข้าสู่ระบบก่อนนะ แล้วเมโต้จะช่วยดูโค้ดให้เลย!", "ai");
        return null;
    }

    var description = "";
    try {
        description = describeWorkspace();
    } catch (e) { /* ignore */ }

    console.log("[AI] ถาม AI:", question);

    // แสดง loading indicator
    var loadingId = addChatBubble(null, "ai-loading");

    try {
        var response = await fetch(AI_SERVER_URL + "/analyze", {
            method: "POST",
            headers: aiHeaders(),
            body: JSON.stringify({
                code: description.trim(),
                question: question,
                session_id: aiSessionId,
                project_id: (typeof ProjectStore !== 'undefined' ? ProjectStore.currentId : null),
                blockly_xml: currentWorkspaceXml(),
            })
        });

        var data = await response.json();

        // ลบ loading indicator
        removeChatBubble(loadingId);

        if (response.status === 401) {
            addChatBubble("เซสชันหมดอายุแล้ว ลองเข้าสู่ระบบใหม่อีกครั้งนะ", "ai");
            return null;
        }

        if (data.reply) {
            console.log("[AI] ผู้ช่วยสอน:", data.reply);
            addChatBubble(data.reply, "ai");
            return data.reply;
        } else if (data.error) {
            console.warn("[AI] Error (dev only):", data.error);
            addChatBubble("เมโต้ไม่ว่างตอนนี้ ลองถามอีกทีนะ!", "ai");
        }
    } catch (error) {
        removeChatBubble(loadingId);
        console.warn("[AI] Connection error (dev only):", error.message);
        addChatBubble("เมโต้เชื่อมต่อไม่ได้ ลองใหม่อีกทีนะ!", "ai");
    }
    return null;
}

// ==================== Chat UI Logic ====================

var isChatOpen = false;
var chatBubbleCount = 0;

// เปิด/ปิด แถบพิมพ์ + กล่องแชท
function toggleChat() {
    isChatOpen = !isChatOpen;
    var inputArea = document.getElementById('chat-input-area');
    var chatMessages = document.getElementById('chat-messages');
    var fab = document.getElementById('chat-fab');

    if (isChatOpen) {
        inputArea.classList.remove('chat-hidden');
        chatMessages.classList.add('chat-open');
        fab.classList.add('active');

        // แสดง bubble ที่เคย fade หายไปกลับมา
        var hidden = chatMessages.querySelectorAll('.bubble-hidden');
        hidden.forEach(function (b) {
            b.classList.remove('bubble-hidden');
            b.classList.remove('bubble-fading');
            b.style.opacity = '';
        });

        setTimeout(function () {
            document.getElementById('chat-input').focus();
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 100);
    } else {
        inputArea.classList.add('chat-hidden');
        chatMessages.classList.remove('chat-open');
        fab.classList.remove('active');

        // ซ่อน ai-auto bubble ที่เคยแสดงตอนเปิดแชทกลับไป
        var autoMsgs = chatMessages.querySelectorAll('.ai-auto, .system-auto');
        autoMsgs.forEach(function (b) {
            b.classList.add('bubble-hidden');
        });
    }
}

// ส่งข้อความจากช่องพิมพ์
function sendChatMessage() {
    var input = document.getElementById('chat-input');
    var msg = input.value.trim();
    if (!msg) return;

    // แสดงข้อความของผู้ใช้
    addChatBubble(msg, "user");
    input.value = "";

    // Log activity for dashboard
    logActivity('ASK_AI', { question_length: msg.length });

    // ส่งไป AI
    askAI(msg);
}

// เพิ่ม bubble ลงในช่องแชท
// ไอคอนวาดเอง (SVG ทึบ สีตาม currentColor) — ห้ามใช้อีโมจิในเว็บ (เจ้าของสั่ง 8 พ.ย. 2569)
var METO_SVG_ROBOT = '<svg viewBox="0 0 32 32" width="20" height="20" fill="currentColor" aria-hidden="true">' +
    '<rect x="5" y="8" width="22" height="17" rx="4"/><rect x="15" y="2" width="2" height="6"/><circle cx="16" cy="2.5" r="2.5"/>' +
    '<circle cx="11.5" cy="16" r="3" fill="#fff"/><circle cx="20.5" cy="16" r="3" fill="#fff"/></svg>';
var METO_SVG_CALENDAR = '<svg viewBox="0 0 32 32" width="14" height="14" fill="currentColor" aria-hidden="true" style="vertical-align:-2px">' +
    '<rect x="3" y="6" width="26" height="23" rx="3"/><rect x="8" y="2" width="3" height="7" rx="1"/><rect x="21" y="2" width="3" height="7" rx="1"/>' +
    '<rect x="6" y="13" width="20" height="13" fill="#fff"/></svg>';

function addChatBubble(text, type) {
    var container = document.getElementById('chat-messages');
    var bubble = document.createElement('div');
    var bubbleId = 'chat-' + (++chatBubbleCount);
    bubble.id = bubbleId;

    if (type === "ai-loading") {
        bubble.className = 'chat-bubble ai';
        bubble.innerHTML =
            '<div class="chat-avatar">' + METO_SVG_ROBOT + '</div>' +
            '<div class="chat-loading">' +
            '<span class="chat-loading-dot"></span>' +
            '<span class="chat-loading-dot"></span>' +
            '<span class="chat-loading-dot"></span>' +
            '</div>';
    } else if (type === "user") {
        bubble.className = 'chat-bubble user';
        bubble.innerHTML = '<div>' + escapeHtml(text) + '</div>';
    } else if (type === "ai-auto") {
        // แชทไลฟ์ — ขึ้นเสมอแม้ปิดแชท + fade หาย
        bubble.className = 'chat-bubble ai ai-auto';
        bubble.innerHTML =
            '<div class="chat-avatar">' + METO_SVG_ROBOT + '</div>' +
            '<div>' + escapeHtml(text) + '</div>';
    } else if (type === "ai") {
        bubble.className = 'chat-bubble ai';
        bubble.innerHTML =
            '<div class="chat-avatar">' + METO_SVG_ROBOT + '</div>' +
            '<div>' + escapeHtml(text) + '</div>';
    } else if (type === "system-auto") {
        // ข้อความระบบ แบบไลฟ์ (ไม่ใช่หุ่นยนต์)
        bubble.className = 'chat-bubble system system-auto';
        bubble.innerHTML = '<div>' + escapeHtml(text) + '</div>';
    } else {
        bubble.className = 'chat-bubble system';
        bubble.textContent = text;
    }

    container.appendChild(bubble);

    // Auto fade-out: เฉพาะ ai-auto ตอนแชทปิด — fade แล้วซ่อน (ไม่ลบ)
    if (type === "ai-auto" || type === "system-auto") {
        setTimeout(function () {
            if (!isChatOpen && bubble.parentElement && !bubble.classList.contains('bubble-hidden')) {
                bubble.classList.add('bubble-fading');
                setTimeout(function () {
                    if (bubble.parentElement) {
                        bubble.classList.remove('bubble-fading');
                        bubble.classList.add('bubble-hidden');
                    }
                }, 1500);
            }
            // 8 วินาทีสั้นเกินสำหรับเด็ก ม.ต้น ที่ต้องอ่านคำเตือนแล้วหาบล็อกตาม
            // ยืดเป็น 20 วินาที (แชทเปิดอยู่ก็ไม่จางอยู่แล้ว)
        }, 20000);
    }

    // Scroll ลงล่าง
    container.scrollTop = container.scrollHeight;

    return bubbleId;
}

// ลบ bubble (ใช้กับ loading)
function removeChatBubble(bubbleId) {
    var el = document.getElementById(bubbleId);
    if (el) el.remove();
}

// Escape HTML เพื่อความปลอดภัย
function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Enter key ส่งข้อความ
document.addEventListener('DOMContentLoaded', function () {
    var chatInput = document.getElementById('chat-input');
    if (chatInput) {
        chatInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendChatMessage();
            }
        });
    }
});

// ==================== Project Save / Load (ProjectStore) ====================
// ระบบบันทึกโปรเจกต์บล็อกโค้ด:
//   - ผู้ใช้ที่ล็อกอิน  → บันทึกขึ้นเซิร์ฟเวอร์ (/api/projects)
//   - ผู้ใช้ทั่วไป (guest) → บันทึกลง localStorage ของเครื่อง
//   - Autosave ลง localStorage เสมอ กันงานหาย ปิดแท็บแล้วกลับมาต่อได้

var ProjectStore = {
    currentId: null,       // id โปรเจกต์บนเซิร์ฟเวอร์ (null = ยังไม่เคยเซฟ)
    currentTitle: null,
    AUTOSAVE_KEY: 'meto_workspace_autosave',
    GUEST_KEY: 'meto_guest_project',
    _autosaveTimer: null,

    // ---------- XML helpers ----------
    getXmlText: function () {
        if (!workspace) return '';
        var dom = Blockly.Xml.workspaceToDom(workspace);
        return Blockly.Xml.domToText(dom);
    },

    loadXmlText: function (xmlText) {
        if (!workspace || !xmlText) return false;
        try {
            // Blockly เวอร์ชันใหม่ย้าย textToDom ไป utils.xml
            var dom = (Blockly.utils && Blockly.utils.xml && Blockly.utils.xml.textToDom)
                ? Blockly.utils.xml.textToDom(xmlText)
                : Blockly.Xml.textToDom(xmlText);
            workspace.clear();
            Blockly.Xml.domToWorkspace(dom, workspace);
            return true;
        } catch (e) {
            console.error('โหลดบล็อกไม่สำเร็จ:', e);
            return false;
        }
    },

    // ---------- Attach (เรียกจาก initWorkspace) ----------
    attach: function () {
        var self = this;

        // กู้งานล่าสุดจาก autosave (ถ้ากระดานยังว่าง)
        try {
            var saved = localStorage.getItem(this.AUTOSAVE_KEY);
            if (saved && workspace.getAllBlocks(false).length === 0) {
                var data = JSON.parse(saved);
                if (data && data.xml) {
                    this.loadXmlText(data.xml);
                    this.currentId = data.id || null;
                    this.currentTitle = data.title || null;
                    this._updateSaveButton();
                }
            }
        } catch (e) { /* autosave เสีย ก็เริ่มใหม่ */ }
        this._syncTitleUI();

        // กระดานยังว่างอยู่ = เด็กเปิดมาครั้งแรก
        // เดิมเจอกริดจุดเปล่า ๆ ไม่มีอะไรบอกว่าต้องทำอะไรต่อ
        // วางบล็อก START PROGRAM ไว้ให้เลย เด็กจะได้มีจุดเริ่มที่จับต้องได้
        if (workspace.getAllBlocks(false).length === 0) {
            this._seedStarterBlock();
        }

        // Autosave ทุกครั้งที่บล็อกเปลี่ยน (debounce 1 วิ)
        workspace.addChangeListener(function (event) {
            if (event.isUiEvent) return;
            clearTimeout(self._autosaveTimer);
            self._autosaveTimer = setTimeout(function () {
                self._autosaveLocal();
            }, 1000);
        });

        // ช่องชื่อโปรเจกต์ใน header: Enter/คลิกออก = ยืนยันชื่อ
        var titleInput = document.getElementById('project-title-input');
        if (titleInput && !titleInput.dataset.bound) {
            titleInput.dataset.bound = '1';
            titleInput.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') { e.preventDefault(); titleInput.blur(); }
            });
            titleInput.addEventListener('blur', function () {
                self.commitTitle(titleInput.value);
            });
        }
    },

    // วาง START PROGRAM ไว้กลางจอ + ชวนให้ลากบล็อกมาต่อ
    _seedStarterBlock: function () {
        try {
            var b = workspace.newBlock('start_program');
            b.initSvg();
            var m = workspace.getMetrics();
            var x = m ? (m.viewWidth / 2 - 90) : 220;
            b.moveBy(Math.max(x, 60), 90);
            b.render();
            // อย่าให้บล็อกตั้งต้นไปนับเป็น "งานที่เด็กทำ" ใน autosave ทันที
            if (typeof ProjectStore !== 'undefined') ProjectStore.currentTitle = null;
            setTimeout(function () {
                if (typeof addChatBubble === 'function') {
                    addChatBubble('สวัสดี! ลากบล็อกจากเมนูซ้ายมาต่อ "ใต้" บล็อก START PROGRAM แล้วกด Run ดูนะ', 'system-auto');
                }
            }, 900);
        } catch (e) { /* ไม่ได้ก็ปล่อยกระดานว่างไปตามเดิม */ }
    },

    // ---------- Title UI (ช่องชื่องานใน header แบบ Tinkercad) ----------
    _syncTitleUI: function () {
        var input = document.getElementById('project-title-input');
        if (input) input.value = this.currentTitle || '';
    },

    // ยืนยันชื่อจากช่อง header — ถ้าโปรเจกต์เคยเซฟแล้ว เปลี่ยนชื่อบนเซิร์ฟเวอร์ทันที
    commitTitle: async function (raw) {
        var title = (raw || '').trim();
        if (!title || title === this.currentTitle) {
            this._syncTitleUI(); // ค่าว่าง/ไม่เปลี่ยน → คืนค่าเดิม
            return;
        }
        var oldTitle = this.currentTitle;
        this.currentTitle = title;
        this._updateSaveButton();
        this._autosaveLocal();

        // เปลี่ยนชื่อโปรเจกต์ที่เซฟไว้แล้ว → อัปเดตเซิร์ฟเวอร์เลย ไม่ต้องรอกดบันทึก
        if (this.currentId && typeof Auth !== 'undefined' && Auth.isLoggedIn()) {
            try {
                var res = await this._postProject(title, this.getXmlText(), this.currentId);
                if (res.ok) {
                    this._toast('เปลี่ยนชื่อเป็น "' + title + '" แล้ว', 'success');
                } else {
                    this.currentTitle = oldTitle;
                    this._syncTitleUI();
                    this._toast('เปลี่ยนชื่อไม่สำเร็จ ลองใหม่อีกครั้งนะ', 'warn');
                }
            } catch (e) { /* ออฟไลน์ — ชื่อใหม่จะติดไปกับการบันทึกครั้งหน้า */ }
        }
    },

    // ---------- เริ่มงานใหม่ (กันเซฟทับงานเดิม) ----------
    newProject: function () {
        if (!workspace) {
            Router.navigate('#/workspace');
            if (!workspace) return;
        }
        var hasBlocks = workspace.getAllBlocks(false).length > 0;
        if (hasBlocks) {
            var msg = this.currentId
                ? 'เริ่มงานใหม่ใช่ไหม?\n\nงาน "' + (this.currentTitle || '') + '" ถูกบันทึกไว้แล้ว เปิดกลับมาได้จาก Dashboard'
                : 'เริ่มงานใหม่ใช่ไหม?\n\nบล็อกบนกระดานตอนนี้ยังไม่ได้บันทึก จะหายไปนะ';
            if (!confirm(msg)) return;
        }
        workspace.clear();
        this.currentId = null;
        this.currentTitle = null;
        this._syncTitleUI();
        this._updateSaveButton();
        this._autosaveLocal();
        Router.navigate('#/workspace');
        this._toast('เริ่มงานใหม่แล้ว! ลากบล็อกมาสร้างผลงานได้เลย', 'success');
    },

    _autosaveLocal: function () {
        try {
            localStorage.setItem(this.AUTOSAVE_KEY, JSON.stringify({
                xml: this.getXmlText(),
                id: this.currentId,
                title: this.currentTitle,
                saved_at: new Date().toISOString()
            }));
        } catch (e) { /* localStorage เต็ม — ข้ามไป */ }
    },

    // ---------- Save (ปุ่มบันทึก) ----------
    // คืน id โปรเจกต์ที่บันทึกได้ (null = บันทึกไม่ได้) · opts.quiet = ไม่ต้องขึ้นโน้ต "บันทึกแล้ว"
    save: async function (opts) {
        // กดบันทึกจากหน้า Dashboard → workspace อาจยังไม่ถูกสร้าง
        // พาไปหน้า workspace ก่อน (route จะ initWorkspace + กู้ autosave ให้เอง)
        if (!workspace) {
            Router.navigate('#/workspace');
        }
        if (!workspace || workspace.getAllBlocks(false).length === 0) {
            Router.navigate('#/workspace');
            this._toast('ยังไม่มีบล็อกให้บันทึก ลากบล็อกมาต่อกันก่อน แล้วค่อยกด "บันทึก" นะ', 'warn');
            return null;
        }

        var xml = this.getXmlText();

        // --- Guest: เก็บในเครื่อง ---
        if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) {
            try {
                localStorage.setItem(this.GUEST_KEY, JSON.stringify({
                    xml: xml,
                    title: 'โปรเจกต์ของฉัน',
                    saved_at: new Date().toISOString()
                }));
                this._toast('บันทึกลงเครื่องนี้แล้ว! อยากเก็บออนไลน์และเปิดจากเครื่องไหนก็ได้ ลองเข้าสู่ระบบดูนะ', 'success');
            } catch (e) {
                this._toast('บันทึกไม่สำเร็จ พื้นที่ในเครื่องอาจเต็ม', 'warn');
            }
            return null;
        }

        // --- Logged in: เก็บบนเซิร์ฟเวอร์ ---
        // ชื่อเอาจากช่องใน header (แบบ Tinkercad) — ไม่มีก็ตั้งชื่อให้อัตโนมัติ
        var titleInput = document.getElementById('project-title-input');
        var title = (titleInput && titleInput.value.trim())
            || this.currentTitle
            || 'โปรเจกต์ของฉัน';

        this._setSaving(true);
        var savedId = null;
        try {
            var res = await this._postProject(title, xml, this.currentId);

            // id เดิมหาไม่เจอ (โปรเจกต์ถูกลบ หรือ autosave พก id ของบัญชีอื่น
            // ที่เคยล็อกอินเครื่องนี้) → เซฟเป็นโปรเจกต์ใหม่ของบัญชีปัจจุบันแทน
            if (res.status === 404 && this.currentId) {
                this.currentId = null;
                res = await this._postProject(title, xml, null);
            }

            if (res.ok) {
                var data = await res.json();
                this.currentId = data.project.id;
                this.currentTitle = data.project.title;
                this._syncTitleUI();
                this._updateSaveButton();
                this._autosaveLocal();
                savedId = this.currentId;
                if (!opts || !opts.quiet) this._toast('บันทึก "' + title + '" เรียบร้อยแล้ว! ดูได้ใน Dashboard', 'success');
            } else {
                this._toast('บันทึกไม่สำเร็จ ลองใหม่อีกครั้งนะ', 'warn');
            }
        } catch (e) {
            this._toast('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ งานถูกเก็บไว้ในเครื่องชั่วคราวแล้ว', 'warn');
            this._autosaveLocal();
        }
        this._setSaving(false);
        return savedId;
    },

    // ยิง POST /api/projects (id = null → สร้างใหม่, มี id → อัปเดต)
    _postProject: function (title, xml, id) {
        return fetch('/api/projects', {
            method: 'POST',
            headers: Auth.getHeaders(),
            body: JSON.stringify({
                id: id || undefined,
                title: title,
                blockly_xml: xml,
                generated_code: ''
            })
        });
    },

    // ล้างความผูกพันกับโปรเจกต์เดิม (เรียกตอนสลับบัญชี/ออกจากระบบ)
    // บล็อกบนกระดานยังอยู่ แต่การเซฟครั้งถัดไปจะเป็นโปรเจกต์ใหม่ของบัญชีปัจจุบัน
    resetIdentity: function () {
        this.currentId = null;
        this.currentTitle = null;
        try {
            var saved = localStorage.getItem(this.AUTOSAVE_KEY);
            if (saved) {
                var data = JSON.parse(saved);
                data.id = null;
                data.title = null;
                localStorage.setItem(this.AUTOSAVE_KEY, JSON.stringify(data));
            }
        } catch (e) { /* autosave เสียก็ไม่เป็นไร */ }
        this._syncTitleUI();
        var btn = document.getElementById('save-btn');
        if (btn) btn.title = 'บันทึกโปรเจกต์';
    },

    // ---------- Save As (เปลี่ยนชื่อ/เซฟเป็นโปรเจกต์ใหม่) ----------
    saveAs: async function () {
        this.currentId = null;
        this.currentTitle = null;
        await this.save();
    },

    // ---------- เปิดโปรเจกต์จาก Dashboard ----------
    openFromServer: async function (projectId) {
        // ไปหน้า workspace ก่อน (จะ initWorkspace ให้อัตโนมัติ)
        Router.navigate('#/workspace');
        if (!workspace && typeof initWorkspace === 'function') initWorkspace();

        try {
            var res = await fetch('/api/projects/' + projectId, {
                headers: Auth.getHeaders()
            });
            if (!res.ok) {
                this._toast('เปิดโปรเจกต์ไม่สำเร็จ', 'warn');
                return;
            }
            var data = await res.json();
            var p = data.project;
            if (this.loadXmlText(p.blockly_xml)) {
                var isMine = Auth.isLoggedIn() && Auth.user && p.user_id === Auth.user.id;
                if (isMine) {
                    this.currentId = p.id;
                    this.currentTitle = p.title;
                    this._toast('เปิด "' + p.title + '" แล้ว มาต่อกันเลย!', 'success');
                } else {
                    // งานของคนอื่น (เช่น ผู้ดูแลเปิดดูงานสมาชิก) — ดูได้ แต่ถ้าเซฟจะเป็นสำเนาของตัวเอง
                    this.currentId = null;
                    this.currentTitle = null;
                    this._toast('กำลังดูงาน "' + p.title + '" (ของสมาชิก) ถ้ากดบันทึกจะเก็บเป็นสำเนาของคุณเอง', 'success');
                }
                this._syncTitleUI();
                this._updateSaveButton();
                this._autosaveLocal();
            }
        } catch (e) {
            this._toast('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้', 'warn');
        }
    },

    // ---------- UI feedback ----------
    _setSaving: function (saving) {
        var btn = document.getElementById('save-btn');
        if (!btn) return;
        btn.disabled = saving;
        var label = document.getElementById('save-btn-text');
        if (label) label.textContent = saving ? 'กำลังบันทึก...' : 'บันทึก';
    },

    _updateSaveButton: function () {
        var btn = document.getElementById('save-btn');
        if (btn && this.currentTitle) {
            btn.title = 'บันทึก: ' + this.currentTitle;
        }
    },

    _toast: function (message, type) {
        // Snackbar ลอยกลางบนจอ — เห็นได้ทุกหน้า (chat bubble เดิมมองไม่เห็นบนหน้า Dashboard)
        var old = document.getElementById('meto-snackbar');
        if (old) old.remove();

        var bar = document.createElement('div');
        bar.id = 'meto-snackbar';
        bar.className = 'meto-snackbar ' + (type === 'warn' ? 'snackbar-warn' : 'snackbar-success');
        bar.textContent = message;
        document.body.appendChild(bar);

        // เข้าจอ → ค้าง 3.5 วิ → จางออก
        requestAnimationFrame(function () { bar.classList.add('show'); });
        setTimeout(function () {
            bar.classList.remove('show');
            setTimeout(function () { bar.remove(); }, 400);
        }, 3500);
    }
};

// ==================== Boot Fix ====================
// auth.js เรียก Router.navigate ก่อน script.js โหลดเสร็จ ทำให้ initWorkspace
// ยังไม่ถูกนิยามตอน onShow ทำงาน (เช่นตอนรีเฟรชหน้าที่ #/workspace ค้างอยู่)
// จึง re-trigger route ปัจจุบันอีกครั้งเมื่อทุกฟังก์ชันพร้อมแล้ว
if (typeof Router !== 'undefined') {
    Router.navigate();
}


// =====================================================================
// แถบภารกิจบนหน้า Workspace
// ---------------------------------------------------------------------
// ลำดับความสำคัญของ "ภารกิจที่แสดง":
//   1. ภารกิจที่ผู้ดูแลสั่ง (ผู้ดูแลเขียนเองทั้งหมด — หัวข้อ คำอธิบาย เกณฑ์ผ่าน)
//   2. ตัวอย่างที่เด็กเลือกเอง (สำหรับเด็กที่ยังไม่มีผู้ดูแล หรืออยากลองเล่นระหว่างรอ)
//
// ชุดภารกิจใน PRESET_TASKS เป็นแค่ "ตัวอย่าง" ไม่ใช่หลักสูตร
// จึงไม่แสดงป้ายระดับ (Sequential/If-Else/Loop) บนหน้าเด็ก
// เพราะผู้ดูแลส่วนใหญ่ไม่ได้แบ่งบทเรียนเป็น 3 ระดับแบบนั้น
//
// เกณฑ์ผ่านตัวจริงอยู่ที่เซิร์ฟเวอร์เสมอ (_check_task_goal)
// ฝั่งนี้ติ๊กให้ดูระหว่างลากเฉย ๆ ไม่ได้เป็นตัวตัดสิน — แต่ต้องใช้กติกาเดียวกัน
// ไม่งั้นเด็กจะเห็นติ๊กครบแล้วส่งไม่ผ่าน
// =====================================================================
var Mission = {
    KEY: 'meto_mission',
    ROOM_KEY: 'meto_mission_room',   // ห้องที่เด็กกด "ลุยเลย" มา แถบโชว์เฉพาะงานของห้องนั้น
    blockLabels: {},
    assignments: [],
    current: null,
    _allMetBefore: false,
    _sizedOnce: false,

    init: function () {
        var self = this;
        // ตารางแปลชื่อบล็อกเป็นภาษาไทย — เซิร์ฟเวอร์เป็นเจ้าของรายการนี้
        fetch('/api/tasks/blocks')
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (d) {
                (d && d.blocks || []).forEach(function (b) { self.blockLabels[b.key] = b.label; });
            })
            .catch(function () { /* ใช้ตารางสำรองใน LABELS แทน */ })
            .then(function () { self.loadAssignments(); });
    },

    // ภารกิจที่ผู้ดูแลสั่ง — ระบบไม่มีภารกิจสำเร็จรูปแล้ว ผู้ดูแลเขียนเองทั้งหมด
    // เด็กที่ยังไม่ได้ล็อกอินหรือยังไม่มีห้อง จะไม่มีแถบภารกิจ (ไม่ใช่ข้อผิดพลาด)
    loadAssignments: function () {
        var self = this;
        if (typeof Auth === 'undefined') return;
        // ต้องรู้ก่อนว่าใครล็อกอินอยู่ ไม่งั้นยิงตอน token ยังไม่ถูกอ่านเข้ามา
        Promise.resolve(Auth.ready).catch(function () { }).then(function () {
            if (!Auth.isLoggedIn()) return;   // ยังไม่ล็อกอิน = ยังไม่มีภารกิจ ไม่ใช่ข้อผิดพลาด
            self._fetchAssignments();
        });
    },

    _fetchAssignments: function () {
        var self = this;
        fetch('/api/dashboard', { headers: Auth.getHeaders() })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (d) {
                self.renderHud(d);
                var list = (d && d.assignments) || [];
                // เด็กอยู่ 2 ห้อง ห้ามเห็นงานของสองห้องปนกัน: ใช้ห้องที่กด "ลุยเลย" มา
                var room = null;
                try { room = localStorage.getItem(self.ROOM_KEY); } catch (e) { }
                if (room && list.some(function (a) { return String(a.classroom_id) === room; })) {
                    list = list.filter(function (a) { return String(a.classroom_id) === room; });
                }
                // ลำดับเดียวกับการ์ด "ภารกิจถัดไป" ในหน้าห้อง: ยังไม่ส่งก่อน แล้วกำหนดส่งใกล้สุดก่อน
                // งานที่ส่งแล้วยังอยู่ในรายการ (ส่งใหม่ได้) แต่ไปอยู่ท้าย
                self.assignments = list.slice().sort(function (a, b) {
                    if (!!a.submitted !== !!b.submitted) return a.submitted ? 1 : -1;
                    if (a.due_date && b.due_date) return a.due_date < b.due_date ? -1 : 1;
                    if (a.due_date) return -1;
                    if (b.due_date) return 1;
                    return 0;
                });
                self.restore();
            })
            .catch(function () { /* ต่อเซิร์ฟเวอร์ไม่ได้ ก็ไม่ต้องมีแถบภารกิจ */ });
    },

    // สถานะผู้เล่น — "วันที่มาเล่น" + "ภารกิจวันนี้"
    // ไม่ใช้ streak รายวันแบบ Duolingo เพราะเด็กเรียนวิชานี้คาบเดียวต่อสัปดาห์
    // streak จะขาดตั้งแต่วันที่สองแล้วกลายเป็นการลงโทษ (ขัดกฎห้ามลงโทษเด็ก)
    // ใช้เลขสะสมที่ขึ้นอย่างเดียวแทน — สะสมได้ ไม่มีอะไรให้เสีย
    renderHud: function (d) {
        var hud = document.getElementById('player-hud');
        var days = document.getElementById('hud-days');
        var quest = document.getElementById('hud-quest');
        if (!hud || !d) return;

        var shown = false;
        if (days) {
            if (d.days_played > 0) {
                days.innerHTML = METO_SVG_CALENDAR + ' มาเล่นแล้ว ' + d.days_played + ' วัน';
                days.style.display = '';
                shown = true;
            } else { days.style.display = 'none'; }
        }
        // ภารกิจวันนี้แบบสุ่ม เลิกโชว์ (แผนแดชบอร์ดใหม่ 8 พ.ย.: "ภารกิจ" ต้องมีความหมายเดียว)
        if (quest) quest.style.display = 'none';
        if (false) {
            var q = d.daily_quest;
            if (q && q.objective_name) {
                var target = q.mastery_threshold || 3;
                var got = Math.min(q.clean_runs || 0, target);
                var doneQuest = got >= target;
                quest.textContent = (doneQuest ? 'ผ่านแล้ว ' : '') + 'วันนี้: ' + q.objective_name +
                    ' ' + got + '/' + target;
                quest.classList.toggle('is-done', doneQuest);
                quest.style.display = '';
                shown = true;
            } else { quest.style.display = 'none'; }
        }
        hud.style.display = shown ? '' : 'none';

        // มี HUD แต่ยังไม่มีภารกิจจากผู้ดูแล ก็ยังต้องเห็นแถบ
        var bar = document.getElementById('mission-bar');
        if (shown && bar) bar.classList.remove('hidden');
    },

    restore: function () {
        // ไม่มีภารกิจจากผู้ดูแล แต่มี HUD อยู่ = แถบยังต้องอ่านรู้เรื่อง
        // ไม่ใช่ปล่อยหัวข้อว่างให้เด็กงงว่าอะไรหายไป
        if (!this.assignments.length) {
            var ti = document.getElementById('mission-title');
            var de = document.getElementById('mission-desc');
            var ul = document.getElementById('mission-checks');
            var none = document.getElementById('mission-nogoal');
            var pick = document.getElementById('mission-pick');
            if (ti) ti.textContent = 'ยังไม่มีภารกิจจากผู้ดูแล';
            if (de) {
                de.textContent = 'ระหว่างรอ ลากบล็อกมาลองเล่นได้เลย กด Run ดูว่าหุ่นทำอะไรบ้าง';
                de.style.display = '';
            }
            if (ul) ul.innerHTML = '';
            if (none) none.style.display = 'none';
            if (pick) pick.style.display = 'none';
            return;
        }
        var saved = null;
        try { saved = localStorage.getItem(this.KEY); } catch (e) { }
        var pick = this.assignments.filter(function (a) { return String(a.id) === saved; })[0];
        this.setTask(pick || this.assignments[0]);
    },

    setTask: function (task) {
        if (!task) return;
        this.current = task;
        try { localStorage.setItem(this.KEY, String(task.id)); } catch (e) { }

        var bar = document.getElementById('mission-bar');
        if (bar) {
            bar.classList.remove('hidden');
            if (!this._sizedOnce) {
                this._sizedOnce = true;
                // จอเล็กเริ่มแบบย่อ — พื้นที่ลากบล็อกสำคัญกว่ารายละเอียดภารกิจ
                if (window.innerWidth <= 620) {
                    bar.classList.add('is-min');
                    var ic = document.getElementById('mission-toggle-icon');
                    if (ic) ic.textContent = 'expand_more';
                }
            }
        }

        var ti = document.getElementById('mission-title');
        var de = document.getElementById('mission-desc');
        if (ti) ti.textContent = task.title || '';
        if (de) {
            de.textContent = task.description || '';
            de.style.display = task.description ? '' : 'none';
        }

        // มีภารกิจข้อเดียวก็ไม่ต้องมีปุ่มเปลี่ยน
        var pick = document.getElementById('mission-pick');
        if (pick) pick.style.display = this.assignments.length > 1 ? '' : 'none';
        this._renderStatus();

        this.refresh();
    },

    // ---------- อ่านกระดานปัจจุบัน (กติกาเดียวกับ skills.py analyze_workspace) ----------
    // ถ้าแก้ COMMAND_BLOCKS ใน skills.py ต้องแก้ที่นี่ให้ตรงกันด้วย
    COMMAND_BLOCKS: [
        'start_program', 'move_forward', 'move_backward', 'turn_left', 'turn_right',
        'wait_one_sec', 'delay_sec',
        'arm_left_close', 'arm_left_normal', 'arm_left_open',
        'arm_right_close', 'arm_right_normal', 'arm_right_open',
        'hand_left_down', 'hand_left_center', 'hand_left_up',
        'hand_right_down', 'hand_right_center', 'hand_right_up',
        'head_turn_right', 'head_center', 'head_turn_left',
        'face_normal', 'face_look_left', 'face_look_right',
        'face_happy', 'face_sad', 'face_angry',
        'face_shocked', 'face_sleepy', 'face_confused',
        'face_love', 'face_shy',
        // บล็อกใหม่ (เฟิร์มแวร์ 6 พ.ย.)
        'move_timed', 'turn_timed', 'move_stop', 'arm_lift', 'hand_grip_pct',
        'head_yaw', 'head_tilt', 'head_speed', 'face_emotion', 'wait_ms',
        'grip_smart', 'grip_release', 'grip_verify', 'grip_percent'
    ],
    LOOP_BLOCKS: ['controls_repeat_ext', 'controls_whileUntil', 'controls_forever'],

    analyze: function () {
        var out = { types: [], commandCount: 0, maxLoopBody: 0 };
        if (typeof workspace === 'undefined' || !workspace) return out;
        var all = workspace.getAllBlocks(false);
        for (var i = 0; i < all.length; i++) {
            var t = all[i].type;
            if (out.types.indexOf(t) === -1) out.types.push(t);
            if (this.COMMAND_BLOCKS.indexOf(t) !== -1) out.commandCount++;
            if (this.LOOP_BLOCKS.indexOf(t) !== -1) {
                var inner = all[i].getInputTargetBlock('DO');
                var n = 0;
                while (inner) { n++; inner = inner.getNextBlock(); }
                if (n > out.maxLoopBody) out.maxLoopBody = n;
            }
        }
        return out;
    },

    // ตารางสำรอง ใช้ตอนดึงจากเซิร์ฟเวอร์ไม่ได้
    LABELS: {
        'start_program': 'บล็อก START PROGRAM',
        'move_forward': 'เดินหน้า',
        'move_backward': 'ถอยหลัง',
        'turn_': 'เลี้ยว (ซ้ายหรือขวา)',
        'arm_': 'คำสั่งแขน',
        'hand_': 'คำสั่งมือ',
        'head_': 'คำสั่งหัว',
        'face_': 'คำสั่งหน้าตา',
        'grip_': 'คำสั่งที่หนีบ',
        'controls_if': 'บล็อก if',
        'controls_repeat_ext': 'บล็อก repeat',
        'controls_whileUntil': 'บล็อก while',
        'controls_forever': 'บล็อก repeat forever',
        'variables_set': 'ตั้งค่าตัวแปร',
        'sensor_': 'บล็อกเซนเซอร์ (ถือของ / ขอบโต๊ะ / หน้าคน)',
        'logic_operation': 'บล็อก and / or'
    },

    labelFor: function (key) {
        return this.blockLabels[key] || this.LABELS[key] || key;
    },

    checks: function () {
        var t = this.current;
        var goal = t && t.goal;
        if (!goal) return [];
        if (!goal.required_blocks && !goal.min_commands && !goal.needs_loop_body) return [];
        var info = this.analyze();
        var list = [];

        (goal.required_blocks || []).forEach(function (req) {
            var met = info.types.some(function (ty) { return ty === req || ty.indexOf(req) === 0; });
            list.push({ met: met, text: 'ใช้ ' + Mission.labelFor(req) });
        });

        if (goal.min_commands) {
            list.push({
                met: info.commandCount >= goal.min_commands,
                text: 'มีคำสั่งอย่างน้อย ' + goal.min_commands + ' บล็อก (ตอนนี้ ' + info.commandCount + ')'
            });
        }

        if (goal.needs_loop_body) {
            list.push({
                met: info.maxLoopBody >= goal.needs_loop_body,
                text: 'ใส่คำสั่งใน loop อย่างน้อย ' + goal.needs_loop_body + ' บล็อก (ตอนนี้ ' + info.maxLoopBody + ')'
            });
        }
        return list;
    },

    refresh: function () {
        if (!this.current) return;
        var ul = document.getElementById('mission-checks');
        var none = document.getElementById('mission-nogoal');
        if (!ul) return;
        var list = this.checks();

        // ผู้ดูแลไม่ได้ตั้งเกณฑ์อัตโนมัติ = ผู้ดูแลตรวจเอง ซึ่งเป็นเรื่องปกติ
        // ต้องบอกเด็กตรง ๆ ไม่ใช่โชว์ช่องว่างให้งงว่าเช็กลิสต์หายไปไหน
        if (!list.length) {
            ul.innerHTML = '';
            if (none) none.style.display = '';
            var barEmpty = document.getElementById('mission-bar');
            if (barEmpty) barEmpty.classList.remove('is-complete');
            this._allMetBefore = false;
            return;
        }
        if (none) none.style.display = 'none';

        ul.innerHTML = list.map(function (c) {
            return '<li class="' + (c.met ? 'is-met' : '') + '">' +
                '<i class="material-icons">' + (c.met ? 'check_circle' : 'radio_button_unchecked') + '</i>' +
                '<span>' + c.text + '</span></li>';
        }).join('');

        var allMet = list.every(function (c) { return c.met; });
        var bar = document.getElementById('mission-bar');
        if (bar) bar.classList.toggle('is-complete', allMet);

        // ครบครั้งแรก = จังหวะที่ควรรู้สึกดี แต่ยังไม่ใช่การให้ดาว (ดาวมาตอนกด Run)
        if (allMet && !this._allMetBefore) {
            if (window.SFX) SFX.star();
            if (window.robotReact) window.robotReact('happy');
            if (typeof addChatBubble === 'function') {
                addChatBubble('ครบเกณฑ์แล้ว! กด Run ดูเลยว่าหุ่นทำได้อย่างที่คิดไหม', 'system-auto');
            }
        }
        this._allMetBefore = allMet;
    },

    // สถานะของงานนี้ + ปุ่มส่ง: ส่งงานทำจากตรงนี้ที่เดียว (เดิมต้องกลับไปเลือกงานใน dropdown หน้าห้อง)
    _renderStatus: function () {
        var t = this.current;
        var st = document.getElementById('mission-status');
        var btn = document.getElementById('mission-submit');
        if (!t) return;
        if (st) {
            st.textContent = t.grade ? ('ได้ ' + t.grade.score + '/' + t.grade.max_score)
                : t.submitted ? 'ส่งแล้ว รอตรวจ' : '';
            st.style.display = st.textContent ? '' : 'none';
        }
        if (btn) {
            btn.style.display = '';
            btn.disabled = false;
            btn.textContent = t.submitted ? 'ส่งใหม่' : 'ส่งงานนี้';
        }
    },

    // หุ่นจำลองรันโค้ดชุดที่อยู่บนกระดานตอนนี้จนจบไหม (แก้บล็อกหลังรัน = ต้องรันใหม่)
    _simOk: function () {
        try {
            var now = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(workspace));
            return window.metoSimRunEnd === 2 && window.metoSimRunXml === now;
        } catch (e) {
            return false;
        }
    },

    // บันทึกงานบนกระดาน แล้วส่งเป็นงานของภารกิจที่เลือกอยู่
    submit: async function () {
        var t = this.current;
        if (!t || typeof Auth === 'undefined' || !Auth.isLoggedIn()) return;
        var btn = document.getElementById('mission-submit');
        if (btn) { btn.disabled = true; btn.textContent = 'กำลังส่ง…'; }
        var projectId = await ProjectStore.save({ quiet: true });
        if (!projectId) { this._renderStatus(); return; }
        try {
            var res = await fetch('/api/assignments/' + t.id + '/submit', {
                method: 'POST', headers: Auth.getHeaders(),
                body: JSON.stringify({ project_id: projectId, sim_ok: Mission._simOk() })
            });
            var data = await res.json().catch(function () { return {}; });
            if (!res.ok) {
                ProjectStore._toast(data.error || 'ส่งงานไม่สำเร็จ ลองใหม่อีกครั้งนะ', 'warn');
                this._renderStatus();
                return;
            }
            if (window.SFX) SFX.star();
            var miss = data.goal_check && data.goal_check.missing && data.goal_check.missing.length;
            if (data.room_mode === 'equal') {
                // โจทย์ท้า: ไม่มีคนตรวจ ระบบตัดสินทันที
                ProjectStore._toast(miss ? 'ยังไม่ผ่าน: ' + data.goal_check.missing.join(' · ')
                    : 'ผ่านโจทย์ "' + t.title + '" แล้ว!', miss ? 'warn' : 'success');
            } else {
                ProjectStore._toast(miss ? 'ส่งแล้ว! แต่ยังขาดบางข้อในเช็กลิสต์ ส่งใหม่ได้เสมอ'
                    : 'ส่งงาน "' + t.title + '" แล้ว! รอผู้ดูแลตรวจนะ', miss ? 'warn' : 'success');
            }
            t.submitted = true;
            t.grade = null;
            t.attempt_no = (data.submission && data.submission.attempt_no) || t.attempt_no;
            this._renderStatus();
        } catch (e) {
            ProjectStore._toast('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ งานบันทึกไว้แล้ว ลองกดส่งอีกครั้งนะ', 'warn');
            this._renderStatus();
        }
    },

    toggle: function () {
        var bar = document.getElementById('mission-bar');
        if (!bar) return;
        var min = bar.classList.toggle('is-min');
        var ic = document.getElementById('mission-toggle-icon');
        if (ic) ic.textContent = min ? 'expand_more' : 'expand_less';
        if (window.SFX) SFX.click();
    },

    showPicker: function () {
        var self = this;
        var list = this.assignments;
        if (list.length < 2) return;
        var old = document.getElementById('mission-picker');
        if (old) old.remove();

        var wrap = document.createElement('div');
        wrap.id = 'mission-picker';
        wrap.className = 'g-celebrate';
        wrap.innerHTML =
            '<div class="g-celebrate-box">' +
            '<div class="g-title">เลือกภารกิจ</div>' +
            '<div class="mission-list">' +
            list.map(function (t, i) {
                var on = self.current && self.current.id === t.id;
                return '<button class="mission-item' + (on ? ' is-on' : '') + '" data-i="' + i + '">' +
                    '<span class="mission-item-title">' + t.title + '</span></button>';
            }).join('') +
            '</div>' +
            '<button class="g-btn mission-close">ปิด</button>' +
            '</div>';
        document.body.appendChild(wrap);
        requestAnimationFrame(function () { wrap.classList.add('is-on'); });

        function close() { document.removeEventListener('keydown', onKey); wrap.remove(); }
        function onKey(e) { if (e.key === 'Escape') close(); }
        document.addEventListener('keydown', onKey);
        wrap.querySelector('.mission-close').onclick = function () { if (window.SFX) SFX.close(); close(); };
        Array.prototype.forEach.call(wrap.querySelectorAll('.mission-item'), function (btn) {
            btn.onclick = function () {
                if (window.SFX) SFX.click();
                self._allMetBefore = false;
                self.setTask(list[parseInt(btn.dataset.i, 10)]);
                close();
            };
        });
    }
};

/* =====================================================================
   เมนู ☰ ของแถบหัว — จอแคบแล้ว "ย้าย" ของเข้าเมนู ไม่ใช่ "ซ่อนทิ้ง"
   ---------------------------------------------------------------------
   เดิมใช้ media query ไล่ซ่อนทีละชิ้นตามความกว้าง (ชื่อโปรเจกต์ ปุ่มงานใหม่
   ปุ่ม Workspace ปุ่มออกจากระบบ) ผลคือพอย่อจอ ของหายไปเฉย ๆ หาไม่เจอ
   ทั้งที่ทุกอันสำคัญพอกัน — การซ่อนคือการเอาความสามารถออก ไม่ใช่การจัดที่

   วิธีนี้ย้าย element ตัวเดิมเข้าไปในเมนูจริง ๆ ไม่ได้สร้างสำเนา
   id / onclick / event listener จึงเป็นของเดิมทุกอย่าง โค้ดที่อื่นไม่ต้องแก้
   ตอนขยายจอคืนก็ย้ายกลับที่เดิมโดยจำ "พี่น้องตัวถัดไป" ไว้ ลำดับจึงไม่เพี้ยน
   ===================================================================== */
var HeaderMenu = {
    BREAK: 900,          // แคบกว่านี้ = แถบหัวใส่ไม่ครบ
    _home: [],           // ที่อยู่เดิมของแต่ละตัว { el, parent, next }
    _open: false,

    // เรียงตามลำดับที่อยากให้เห็นในเมนู
    SELECTORS: [
        '#project-title-wrap',
        '#connection-status',
        '#header-guest',
        '#header-user',
        '#save-btn',
        '#sfx-btn'
    ],

    init: function () {
        var menu = document.getElementById('header-menu');
        if (!menu || menu.dataset.ready === '1') return;
        menu.dataset.ready = '1';
        var self = this;

        this.SELECTORS.forEach(function (sel) {
            var el = document.querySelector(sel);
            if (el) self._home.push({ el: el, parent: el.parentNode, next: el.nextSibling });
        });

        this.sync();
        window.addEventListener('resize', function () { self.sync(); });

        // กดที่อื่น / กด Esc / เปลี่ยนหน้า = ปิดเมนู
        document.addEventListener('pointerdown', function (e) {
            if (!self._open) return;
            if (e.target.closest('#header-menu, #header-menu-btn')) return;
            self.close();
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && self._open) self.close();
        });
        window.addEventListener('hashchange', function () { self.close(); });
    },

    /** ตัดสินว่าตอนนี้ของควรอยู่ในแถบหัวหรือในเมนู */
    sync: function () {
        var menu = document.getElementById('header-menu');
        var btn = document.getElementById('header-menu-btn');
        if (!menu || !btn) return;
        var narrow = window.innerWidth <= this.BREAK;

        if (narrow) {
            this._home.forEach(function (h) {
                if (h.el.parentNode !== menu) menu.appendChild(h.el);
            });
            btn.style.display = '';
        } else {
            this._home.forEach(function (h) {
                if (h.el.parentNode === menu) h.parent.insertBefore(h.el, h.next);
            });
            btn.style.display = 'none';
            this.close();
        }
        document.body.classList.toggle('header-collapsed', narrow);
    },

    toggle: function () { this._open ? this.close() : this.open(); },

    open: function () {
        var menu = document.getElementById('header-menu');
        var btn = document.getElementById('header-menu-btn');
        if (!menu) return;
        // วางใต้ขอบล่างของแถบหัวจริง — ความสูงแถบหัวเปลี่ยนตามความกว้างจอ
        var hdr = document.getElementById('header-container');
        if (hdr) menu.style.top = Math.round(hdr.getBoundingClientRect().bottom + 6) + 'px';
        menu.classList.remove('hidden');
        if (btn) btn.setAttribute('aria-expanded', 'true');
        this._open = true;
        if (window.SFX) SFX.click();
    },

    close: function () {
        var menu = document.getElementById('header-menu');
        var btn = document.getElementById('header-menu-btn');
        if (!menu) return;
        menu.classList.add('hidden');
        if (btn) btn.setAttribute('aria-expanded', 'false');
        this._open = false;
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { HeaderMenu.init(); });
} else { HeaderMenu.init(); }

/* =====================================================================
   ลากแถบภารกิจไปวางตรงไหนก็ได้
   ---------------------------------------------------------------------
   เดิมตรึงไว้ที่ top:70 left:108 ซึ่งเป็นตำแหน่งเดียวกับลิ้นชักบล็อกที่เลื่อนออกมา
   เด็กกดเปิดหมวดแล้วโดนแถบภารกิจบังบล็อกแถวบนพอดี ต้องย่อแถบก่อนทุกครั้ง
   ให้ลากได้แทน แล้วจำตำแหน่งไว้ในเครื่อง — ครั้งหน้าเปิดมาอยู่ที่เดิม
   ===================================================================== */
var MissionDrag = {
    KEY: 'meto_mission_pos',

    init: function () {
        var bar = document.getElementById('mission-bar');
        if (!bar || bar.dataset.dragReady === '1') return;
        bar.dataset.dragReady = '1';
        var self = this;

        this.apply(this.load());

        bar.addEventListener('pointerdown', function (e) {
            // ปุ่ม/ช่องติ๊ก/ลิงก์ ต้องกดได้ตามปกติ ไม่ใช่กลายเป็นจุดจับลาก
            if (e.target.closest('button, input, select, textarea, a')) return;
            if (e.button !== 0 && e.pointerType === 'mouse') return;

            var r = bar.getBoundingClientRect();
            var pr = self.frame();
            var offX = e.clientX - r.left;
            var offY = e.clientY - r.top;
            var startX = e.clientX, startY = e.clientY;
            var moved = false;

            function move(ev) {
                // ต้องขยับเกิน 4px ก่อนถึงจะนับว่า "ลาก"
                // ไม่งั้นการกดธรรมดาที่นิ้วสั่นนิดเดียวก็บันทึกตำแหน่งใหม่ทับของเดิม
                // แล้วตำแหน่งที่บันทึกไว้จะชนะกฎ responsive ไปตลอด
                if (!moved &&
                    Math.abs(ev.clientX - startX) < 4 &&
                    Math.abs(ev.clientY - startY) < 4) return;
                moved = true;
                bar.classList.add('is-dragging');
                self.apply(self.clamp(
                    ev.clientX - offX - pr.left,
                    ev.clientY - offY - pr.top
                ));
            }
            function up() {
                document.removeEventListener('pointermove', move);
                document.removeEventListener('pointerup', up);
                bar.classList.remove('is-dragging');
                if (moved) self.save();
            }
            document.addEventListener('pointermove', move);
            document.addEventListener('pointerup', up);
            e.preventDefault();          // กันเบราว์เซอร์ไปเลือกตัวหนังสือระหว่างลาก
        });

        // ย่อจอแล้วแถบอาจหลุดออกนอกพื้นที่ — ดึงกลับเข้ามาให้
        //
        // แต่ทำเฉพาะตอนที่ "เคยลากเอง" เท่านั้น
        // ถ้าไม่เคยลาก ตำแหน่งยังเป็นของ CSS ซึ่งมี media query คุมอยู่ตามความกว้างจอ
        // การอ่าน offsetLeft แล้วเขียนกลับเป็น inline style จะไปตรึงค่าที่อ่านได้ ณ ตอนนั้น
        // กฎ responsive ก็แพ้ inline style ทันที แถบเลยค้างอยู่นอกจอตอนย่อลงมือถือ
        window.addEventListener('resize', function () {
            if (!self.hasSaved()) return;
            self.apply(self.clamp(bar.offsetLeft, bar.offsetTop));
        });
    },

    /** กรอบที่ใช้อ้างอิงตำแหน่ง = กล่องที่แถบยึดอยู่จริง (offsetParent) */
    frame: function () {
        var bar = document.getElementById('mission-bar');
        var par = bar.offsetParent;
        return par ? par.getBoundingClientRect()
                   : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    },

    /** ลากหลุดจอแล้วหาไม่เจอจะแย่กว่าลากไม่สุด — บังคับให้เหลือให้เห็นเสมอ */
    clamp: function (left, top) {
        var bar = document.getElementById('mission-bar');
        var pr = this.frame();
        var w = bar.offsetWidth || 300;
        var h = bar.offsetHeight || 120;
        var KEEP = 72;                   // ส่วนที่ต้องโผล่ให้เห็นอย่างน้อย
        // #page-workspace เริ่มใต้แถบหัวอยู่แล้ว top: 0 จึงคือ "ชิดใต้แถบหัวพอดี"
        // ไม่ต้องกันอะไรอีก — ก่อนหน้านี้กันไว้ 64px กลายเป็นกำแพงที่ทำให้
        // ลากแถบขึ้นไปวางแถวบนไม่ได้ทั้งที่ตรงนั้นว่างอยู่
        var TOP_MIN = 0;
        return {
            left: Math.max(-(w - KEEP), Math.min(left, pr.width - KEEP)),
            top: Math.max(TOP_MIN, Math.min(top, pr.height - 36))
        };
    },

    apply: function (pos) {
        if (!pos) return;
        var bar = document.getElementById('mission-bar');
        if (!bar) return;
        bar.style.left = Math.round(pos.left) + 'px';
        bar.style.top = Math.round(pos.top) + 'px';
        bar.style.right = 'auto';
        bar.style.bottom = 'auto';
    },

    save: function () {
        var bar = document.getElementById('mission-bar');
        try {
            localStorage.setItem(this.KEY, JSON.stringify({
                left: bar.offsetLeft, top: bar.offsetTop
            }));
        } catch (e) { /* โหมดส่วนตัวเขียนไม่ได้ ไม่เป็นไร */ }
    },

    hasSaved: function () {
        try { return !!localStorage.getItem(this.KEY); } catch (e) { return false; }
    },

    load: function () {
        try {
            var v = JSON.parse(localStorage.getItem(this.KEY) || 'null');
            if (v && typeof v.left === 'number' && typeof v.top === 'number') {
                return this.clamp(v.left, v.top);
            }
        } catch (e) { /* ค่าเสีย ใช้ตำแหน่งเริ่มต้น */ }
        return null;
    }
};

(function bootMission() {
    function go() {
        if (typeof workspace === 'undefined' || !workspace) {
            return setTimeout(go, 200);   // Blockly ยังไม่พร้อม รออีกนิด
        }
        Mission.init();
        MissionDrag.init();
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', go);
    } else { go(); }
})();
