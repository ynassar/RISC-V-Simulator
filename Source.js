var parsingMode = "text";
var assembled = false;
var lines;
var PC = 0;
var regs = [];
var memory = [];
var terminated = false;
var instructions = ["LB", "LH", "LW", "LBU", "LHU", "SB", "SH", "SW", "SLL", "SLLI", "SRL", "SRLI", "SRA", "SRAI", "ADD", "ADDI", "SUB", "LUI",
"AUIPC", "XOR", "XORI", "OR", "ORI", "AND", "ANDI", "SLT", "SLTI", "SLTU", "SLTIU", "BEQ", "BNE", "BLT", "BGE", "BLTU", "BGEU", "JAL", "JALR"];
var instructionType = {
	LB: "I",
	LH: "I",
	LW: "I",
	LBU: "I",
	LHU: "I",
	SB:	"S",
	SH: "S",
	SW: "S",
	SLL: "R",
	SLLI: "I",
	SRL: "R",
	SRLI: "I",
	SLA: "R",
	SRAI: "I",
	ADD: "R",
	ADDI: "I",
	SUB: "R",
	LUI: "U",
	AUIPC: "U",
	XOR: "R",
	XORI: "I",
	OR: "R",
	ORI: "I",
	AND: "R",
	ANDI: "I",
	SLT: "R",
	SLTI: "I",
	SLTU: "R",
	SLTIU: "I",
	BEQ: "SB",
	BNE: "SB",
	BLT: "SB",
	BGE: "SB",
	BLTU: "SB",
	BGEU: "SB",
	JAL: "UJ",
	JALR: "UJ",
	ECALL: "ECALL",
	LA: "PSEUDO"
}
var LabelAddress = {};
var programInstructions = [];
var lastMemoryAddress = 4*1024;
function selectTextareaLine(tarea,lineNum) {
    var liness = tarea.value.split("\n");

    // calculate start/end
    var startPos = 0, endPos = tarea.value.length;
    for(var x = 0; x < liness.length; x++) {
        if(x == lineNum) {
            break;
        }
        startPos += (liness[x].length+1);

    }

    var endPos = liness[lineNum].length+startPos;

    // do selection
    // Chrome / Firefox

    if(typeof(tarea.selectionStart) != "undefined") {
        tarea.focus();
        tarea.selectionStart = startPos;
        tarea.selectionEnd = endPos;
        return true;
    }

    // IE
    if (document.selection && document.selection.createRange) {
        tarea.focus();
        tarea.select();
        var range = document.selection.createRange();
        range.collapse(true);
        range.moveEnd("character", endPos);
        range.moveStart("character", startPos);
        range.select();
        return true;
    }

    return false;
}
function Step(){
	if(assembled && !terminated){
		RunStep();
	}
	else{
		Assemble();
		RunStep();
	}
}
function Run(){
	Assemble();
	RunAll();
}
function RunAll(){
	while(PC < programInstructions.length * 4){
		var instructionNumber = PC / 4;
		if(RunInstruction(programInstructions[instructionNumber]))
			break;
		selectTextareaLine(document.getElementById("CodeBox"), programInstructions[instructionNumber].lineNumber);
		PC = PC + 4;
		UpdateDisplay();
	}
	document.getElementById("output").innerHTML += "<p> <strong> Program Terminated Successfully </strong> </p>";
	terminated = true;
}
function Assemble(){
		terminated = false;
		document.getElementById("output").innerHTML = "";
		document.getElementById("errors").innerHTML = "";
		InitializeMemory();
		if(ReadInput()){
			assembled = true;
			UpdateDisplay();
			return true;
		}
		return false;
}
function RunStep(){
	if(PC < programInstructions.length * 4){
		var instructionNumber = PC / 4;
		if(RunInstruction(programInstructions[instructionNumber])){
			document.getElementById("output").innerHTML += "<p> <strong> Program Terminated Successfully </strong> </p>";
			terminated = true;
			return;
		}
		selectTextareaLine(document.getElementById("CodeBox"), programInstructions[instructionNumber].lineNumber);
		PC = PC + 4;
		UpdateDisplay();
	}
	else{
		document.getElementById("output").innerHTML += "<p> <strong> Program Terminated Successfully </strong> <p>";
		terminated = true;
	}
}
function UpdateDisplay(){
	for(var i = 0; i < 32; i ++){
		document.getElementById("x" + i.toString()).innerHTML = regs[i];
	}
}
function signExtend8(number){
	if(number >> 7){
		return number & 0xFFFFFF00;
	}
	else{
		return number;
	}
}
function signExtend16(number){
	if(number >> 15){
		return number & 0xFFFF0000;
	}
	else{
		return number;
	}
}
function RunInstruction(inst){
	var rd = inst.rd;
	var	rs1 = inst.rs1;
	var rs2 = inst.rs2;
	var imm = inst.imm;
	var label = inst.label;
	switch(inst.instruction){
		case "LB" :
			regs[rd] = signExtend8(memory[rs1 + imm]);
		break;
		case "LH" :
			regs[rd] = signExtend16((memory[rs1 + imm] << 8) | (memory[rs1 + imm + 1]));
		break;
		case "LW" :
			regs[rd] = (memory[rs1 + imm] << 24) | (memory[rs1 + imm + 1] << 16) | (memory[rs1 + imm + 2] << 8) | (memory[rs1 + imm + 3]);
		break;
		case "LBU" :
			regs[rd] = memory[rs1 + imm];
		break;
		case "LHU" :
			regs[rd] = (memory[rs1 + imm] << 8) | (memory[rs1 + imm + 1]);
		break;
		case "SB" :
			memory[regs[rs1] + imm] = regs[rs2] & 0xFF;
		break;
		case "SH" :
			memory[regs[rs1] + imm] = (regs[rs2] >> 8) & 0xFF;
			memory[regs[rs1] + imm + 1] = regs[rs2] & 0xFF;
		break;
		case "SW" :
			memory[regs[rs1] + imm] = (regs[rs2] >> 24) & 0xFF;
			memory[regs[rs1] + imm + 1] = (regs[rs2] >> 16) & 0xFF;
			memory[regs[rs1] + imm + 2] = (regs[rs2] >> 8) & 0xFF;
			memory[regs[rs1] + imm + 3] = regs[rs2] & 0xFF;
		break;
		case "SLL" :
			regs[rd] = regs[rs1] << (regs[rs2] & 0x1F);
		break;
		case "SLLI" :
			regs[rd] = regs[rs1] << imm;
		break;
		case "SRL" :
			regs[rd] = regs[rs1] >>> (regs[rs2] & 0x1F);
		break;
		case "SRLI" :
			regs[rd] = regs[rs1] >>> imm;
		break;
		case "SRA" :
			regs[rd] = regs[rs1] >> (regs[rs2] & 0x1F);
		break;
		case "SRAI" :
			regs[rd] = regs[rs1] >> imm;
		break;
		case "ADD" :
			regs[rd] = regs[rs1] + regs[rs2];
		break;
		case "ADDI" :
			regs[rd] = regs[rs1] + imm;
		break;
		case "SUB" :
			regs[rd] = regs[rs1] - regs[rs2];
		break;
		case "LUI" :
			regs[rd] += imm << 12;
		break;
		case "AUIPC" :
			regs[rd] = PC + ( imm << 12 );
		break;
		case "XOR" :
			regs[rd] = regs[rs1] ^ regs[rs2];
		break;
		case "XORI" :
			regs[rd] = regs[rs1] ^ imm;
		break;
		case "OR" :
			regs[rd] = regs[rs1] | regs[rs2];
		break;
		case "ORI" :
			regs[rd] = regs[rs1] | imm;
		break;
		case "AND" :
			regs[rd] = regs[rs1] & regs[rs2];
		break;
		case "ANDI" :
			regs[rd] = regs[rs1] & imm;
		break;
		case "SLT" :
			regs[rd] = ( regs[rs1] < regs[rs2] );
		break;
		case "SLTI" :
			regs[rd] = ( regs[rs1] < imm );
		break;
		case "SLTU" :
			regs[rd] = ( regs[rs1] >>> 0 < regs[rs2] >>> 0 );
		break;
		case "SLTIU" :
			regs[rd] = ( regs[rs1] >>> 0 < sext(imm) >>> 0 );
		break;
		case "BEQ" :
			if(!(label in LabelAddress)){
				document.getElementById("errors").innerHTML += "\nInvalid Label\n";
				return false;
			}	
			PC = (regs[rs1] == regs[rs2]) ? LabelAddress[label] - 4 : PC;
		break;
		case "BNE" :
			if(!(label in LabelAddress)){
				document.getElementById("errors").innerHTML += "\nInvalid Label\n";
				return false;
			}
			PC = (regs[rs1] != regs[rs2]) ? LabelAddress[label] - 4 : PC;
		break;
		case "BLT" :
			if(!(label in LabelAddress)){
				document.getElementById("errors").innerHTML += "\nInvalid Label\n";
				return false;
			}
			PC = (regs[rs1] < regs[rs2]) ? LabelAddress[label] - 4 : PC;
		break;
		case "BGE" :
			if(!(label in LabelAddress)){
				document.getElementById("errors").innerHTML += "\nInvalid Label\n";
				return false;
			}
			PC = (regs[rs1] >= regs[rs2]) ? LabelAddress[label] - 4 : PC;
		break;
		case "BLTU" :
			if(!(label in LabelAddress)){
				document.getElementById("errors").innerHTML += "\nInvalid Label\n";
				return false;
			}
			PC = (regs[rs1] >>> 0 < regs[rs2] >>> 0) ? LabelAddress[label] - 4 : PC;

		break;
		case "BGEU" :
			if(!(label in LabelAddress)){
				document.getElementById("errors").innerHTML += "\nInvalid Label\n";
				return false;
			}
			PC = (regs[rs1] >>> 0 >= regs[rs2] >>> 0) ? LabelAddress[label] - 4 : PC;
		break;
		case "JAL" :
			if(!(label in LabelAddress)){
				document.getElementById("errors").innerHTML += "\nInvalid Label\n";
				return false;
			}
			regs[rd] = PC + 4;
			PC = LabelAddress[label] - 4;
		break;
		case "JALR" :
			
		break;
		case "ECALL" :
			switch(regs[17]){
				case 1:
					document.getElementById("output").innerHTML += regs[10].toString();
				break;
				case 4:
					var idx = regs[10];
					while(idx < memory.length && memory[idx] != '\0'){
						document.getElementById("output").innerHTML += memory[idx];
						idx++;
					}
				break;
				case 5:
					var input = prompt("READINT ECALL was invoked. Please enter the int.");
					if(input != null){
						regs[17] = parseInt(input);
					}
				break;
				case 10:
					return true;
				break;
			}
		break;
		case "LA":
			if(!(label in LabelAddress)){
				document.getElementById("output").innerHTML += "\nInvalid Label\n";
				return false;
			}
			regs[rd] = LabelAddress[label];
		break;
	}
	regs[0] = 0;
	return false;
}
function InitializeMemory(){
	parsingMode = "text";
	PC = 0;
	LabelAddress = {};
	lastMemoryAddress = 4*1024;
	regs = [];
	memory = [];
	for(var i = 0; i < 32; i ++){
		regs.push(0);
	}
	for(var i = 0; i < 8 * 1024; i ++){
		memory.push(0);
	}
	programInstructions = [];
}
function ReadInput(){
	var code = document.getElementById("CodeBox").value;
	lines = code.split("\n");
	for (var i = 0; i < lines.length; i ++){
		var InstructionData = ParseInstruction(lines[i]);
		var validity = InstructionData.validity;
		if(validity == "emptyline" || validity == "label"){
			continue;
		}
		else if(validity == "unrecognized"){
			ThrowUnrecognizedInstruction(i);
			return false;
		}
		else if(validity == "badformat"){
			ThrowBadFormat(i);
			return false;
		}
		else if(validity == "ok"){
			InstructionData["lineNumber"] = i;
			programInstructions.push(InstructionData);
		}
	}
	return true;
}
function ThrowUnrecognizedInstruction(lineNumber){
	document.getElementById("errors").innerHTML = "Unrecognized Instruction on line " + (lineNumber + 1).toString();
}
function ThrowBadFormat(lineNumber){
	document.getElementById("errors").innerHTML = "Bad Format Instruction on line " + (lineNumber + 1).toString();
}
function getParsedData(string, remainingString){
	switch(string){
		case "I":
			var parsedData = ParseIFormat(remainingString);
		 break;
		case "R": 
			var parsedData = ParseRFormat(remainingString);
		 break;
		case "S": 
			var parsedData = ParseSFormat(remainingString);
		 break;
		case "SB": 
			var parsedData = ParseSBFormat(remainingString);
		 break;
		case "UJ": 
			var parsedData = ParseUJFormat(remainingString);
		 break;
		 case "ECALL":
			var parsedData = ParseECALLFormat(remainingString);
		 break;
		 case "PSEUDO":
			var parsedData = ParsePseudoFormat(remainingString);
		 break;
	 }
	 return parsedData;
}
function ParseInstruction(line){
	if(parsingMode == "text"){
		var LabelPattern = /^[a-zA-Z][\w]*:$/;
		var DataPattern = /^\.data$/;
		var AllTextPattern = /^[\d]*\.text[\d]*$/;
		if(AllTextPattern.test(line)){
			return {validity : "emptyline"};
		}
		var firstToken = -1;
		var splitLine = line.split(" ");
		for(var i = 0; i < splitLine.length; i ++){
			if(splitLine[i] != ""){
				firstToken = i;
				break;
			}
		}
		if(firstToken == -1){ //There are no non whitespace tokens, line is empty.
			return {validity:"emptyline"};
		}
		if(DataPattern.test(splitLine[firstToken])){
			parsingMode = "data";
			return {validity:"okdata"};
		}
		else{
			if(LabelPattern.test(splitLine[firstToken])){ //This line contains a label
				var secondToken = -1;
				for (var i = firstToken + 1; i < splitLine.length; i ++){
					if(splitLine[i] != ""){
						secondToken = i;
						break;
					}
				}
				if(secondToken = -1){ //This line is just a label
					var label = splitLine[firstToken].slice(0, splitLine[firstToken].length - 1);
					LabelAddress[label] = programInstructions.length * 4; // The label links to the next line
					return {validity:"label"};
				}
				else{ //There's something else
					if(!(splitLine[secondToken].toUpperCase() in instructionType)){ //If the first non whitespace token is not a valid instruction, unrecognized instr.
						return {validity:"unrecognized"};
					}
					else{ //If it doesn't follow it's format, it's badformat
						var remainingString = splitLine.slice(secondToken + 1, splitLine.length).join(" ");
						var parsedData = getParsedData(instructionType[splitLine[secondToken].toUpperCase()], remainingString);
						if(!parsedData.satisfied){
							return {validity : "badformat"};
						}
						else{
							var label = splitLine[firstToken].slice(0, splitLine[firstToken].length - 1);
							LabelAddress[label] = programInstructions.length * 4;
							parsedData["validity"] = "ok";
							parsedData["instruction"] = splitLine[secondToken].toUpperCase();
							return parsedData;
						}
					}
				}
			}
			else{ // No label in this line
				if(!(splitLine[firstToken].toUpperCase() in instructionType)){ //If the first non whitespace token is not a valid instruction, unrecognized instr.
					return {validity:"unrecognized"};
				}
				else{ //If it doesn't follow it's format, it's badformat
					var remainingString = splitLine.slice(firstToken + 1, splitLine.length).join(" ");
					var parsedData = getParsedData(instructionType[splitLine[firstToken].toUpperCase()], remainingString);
					if(!parsedData.satisfied){
						return {validity : "badformat"};
					}
					else{
						parsedData["validity"] = "ok";
						parsedData["instruction"] = splitLine[firstToken].toUpperCase();
						return parsedData;
					}
				}
			}
		}
	}
	else if (parsingMode == "data"){
		var TextPattern = /^\.text$/;
		var firstToken = -1;
		var splitLine = line.split(" ");
		for(var i = 0; i < splitLine.length; i ++){
			if(splitLine[i] != ""){
				firstToken = i;
				break;
			}
		}
		if(firstToken == -1){ //There are no non whitespace tokens, line is empty.
			return {validity:"emptyline"};
		}
		if(TextPattern.test(splitLine[firstToken])){
			parsingMode = "text";
			return {validity:"okdata"};
		}
		else{
			var LabelPattern = /^[a-zA-Z][\w]*:$/;
			if(LabelPattern.test(splitLine[firstToken])){
				var label = splitLine[firstToken].slice(0, splitLine[firstToken].length - 1);
				LabelAddress[label] = lastMemoryAddress;
				var secondToken = -1;
				for (var i = firstToken + 1; i < splitLine.length; i ++){
					if(splitLine[i] != ""){
						secondToken = i;
						break;
					}
				}
				if(secondToken == -1){
					return {validity:"okdata"};
				}
				else{
					var remainingString = splitLine.slice(secondToken + 1, splitLine.length).join(" ");
					switch(splitLine[secondToken]){
						case ".asciiz":
							if(!ParseAsciiData(remainingString)){
								return {validity : "badformat"};
							}
						break;
						case ".int":
							if(!ParseIntData(remainingString)){
								return {validity : "badformat"};
							}
						break;
						case ".byte":
							if(!ParseByteData(remainingString)){
								return {validity : "badformat"};
							}
						break;
						default:
						return {validity: "badformat"};
					}
					return {validity :"okdata"};
				}
			}
			else{
				var remainingString = splitLine.slice(firstToken + 1, splitLine.length).join(" ");
				switch(splitLine[firstToken]){
					case ".asciiz":
						if(!ParseAsciiData(remainingString)){
							return {validity : "badformat"};
						}
					break;
					case ".int":
						if(!ParseIntData(remainingString)){
							return {validity : "badformat"};
						}
					break;
					case ".byte":
						if(!ParseByteData(remainingString)){
							return {validity : "badformat"};
						}
					break;
					default:
					return {validity: "badformat"};
				}
				return {validity:"okdata"};
			}
		}
	}
}
function ParseAsciiData(dataString){
	var pattern = /^[\s]*\"(.*)\"[\s]*/;
	if(!pattern.test(dataString)){
		return false;
	}
	else{
		var execResult = pattern.exec(dataString);
		for(var i =0; i < execResult[1].length; i ++){
			memory[lastMemoryAddress] = execResult[1][i];
			lastMemoryAddress++;
		}
		memory[lastMemoryAddress] = '\0';
		lastMemoryAddress ++;
		return true;
	}
}
function ParseIntData(dataString){
	var pattern = /^[\s]*([0-9]+)[\s]*^/;
	if(!pattern.test(dataString)){
		return false;
	}
	else{
		var execResult = pattern.exec(dataString);
		memory[lastMemoryAddress] = parseInt(execResult[1]) >> 24;
		memory[lastMemoryAddress + 1] = (parseInt(execResult[i]) >> 16) & 0xFF;
		memory[lastMemoryAddress + 2] = (parseInt(execResult[i]) >> 8) & 0xFF;
		memory[lastMemoryAddress + 3] = (parseInt(execResult[i])) & 0xFF;
		lastMemoryAddress += 4;
		return true;
	}
}
function ParseByteData(dataString){
	var pattern = /^[\s]*([0-9]+)[\s]*)/;
	if(!pattern.test(dataString)){
		return false;
	}
	else{
		var execResult = pattern.exec(dataString);
		if(parseInt(execResult[i] >= 256))
			return false;
		memory[lastMemoryAddress] = parseInt(execResult[1]);
		return true;
	}
}
function ParseIFormat(paramString){
	var pattern = /^[\s]*x([0-9][0-9]?)[\s]*,[\s]*x([0-9][0-9]?)[\s]*,[\s]*(\-?[\d]+)[\s]*$/
	if(!pattern.test(paramString)){
		return {satisfied:false};
	}
	else{
		var execResult = pattern.exec(paramString);
		var sat = true;
		if(parseInt(execResult[1]) >= 32 || parseInt(execResult[2]) >= 32 || parseInt(execResult[3]) >= 1048576)
			sat = false;
		return {satisfied:sat, rd : parseInt(execResult[1]), rs1 : parseInt(execResult[2]), imm : parseInt(execResult[3])};
	}
}
function ParseRFormat(paramString){
	var pattern = /^[\s]*x([0-9][0-9]?)[\s]*,[\s]*x([0-9][0-9]?),[\s]*x([0-9][0-9]?)[\s]*$/;
	if(!pattern.test(paramString)){
		return {satisfied:false};
	}
	else{
		var execResult = pattern.exec(paramString);
		var sat = true;
		if(parseInt(execResult[1]) >= 32 || parseInt(execResult[2]) >= 32 || parseInt(execResult[3]) >= 32)
			sat = false;
		return {satisfied:sat, rd : parseInt(execResult[1]), rs1 : parseInt(execResult[2]), rs2 : parseInt(execResult[3])};
	}
}
function ParseSFormat(paramString){
	var pattern = /^[\s]*x([0-9][0-9]?)[\s]*,[\s]*x([0-9][0-9]?)[\s]*,[\s]*(\-?[\d]+)[\s]*$/;
	if(!pattern.test(paramString)){
		return {satisfied:false};
	}
	else{
		var execResult = pattern.exec(paramString);
		var sat = true;
		if(parseInt(execResult[1]) >= 32 || parseInt(execResult[2]) >= 32 || parseInt(execResult[3]) >= 1048576)
			sat = false;
		return {satisfied:sat, rs1 : parseInt(execResult[1]), rs2 : parseInt(execResult[2]), imm : parseInt(execResult[3])};
	}
}
function ParseSBFormat(paramString){
	var pattern = /^[\s]*x([0-9][0-9]?)[\s]*,[\s]*x([0-9][0-9]?)[\s]*,[\s]*([\w]+)[\s]*$/;
	if(!pattern.test(paramString)){
		return {satisfied:false};
	}
	else{
		var execResult = pattern.exec(paramString);
		var sat = true;
		if(parseInt(execResult[1]) >= 32 || parseInt(execResult[2]) >= 32)
			sat = false;
		return {satisfied:sat, rs1 : parseInt(execResult[1]), rs2 : parseInt(execResult[2]), label : execResult[3]};
	}
}
function ParseUJFormat(paramString){
	var pattern = /^[\s]*x([0-9][0-9]?)[\s]*,[\s]*([\w]+)[\s]*$/;
	if(!pattern.test(paramString))
	{
		return {satisfied:false};
	}
	else{
		var execResult = pattern.exec(paramString);
		var sat = true;
		if(parseInt(execResult[1]) >= 32)
			sat = false;
		return {satisfied:sat, rd : parseInt(execResult[1]), label :execResult[2]};
	}
}
function ParseECALLFormat(paramString){
	var pattern = /^[\s]*$/;
	if(!pattern.test(paramString)){
			return {satisfied:false};
	}
	else{
		return {satisfied:true};
	}
}
function ParsePseudoFormat(paramString){
	var pattern = /^[\s]*x([0-9][0-9]?)[\s]*,[\s]*([\w]+)[\s]*$/;
	if(!pattern.test(paramString)){
		return {satisfied : false};
	}
	else{
		var execResult = pattern.exec(paramString);
		var sat = true;
		if(parseInt(execResult[1] >= 32))
			sat = false;
		return {satisfied : sat, rd : parseInt(execResult[1]), label:execResult[2]};
	}
}
