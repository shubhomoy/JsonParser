window.onload = function() {
	var generateBtn = document.getElementById('generate_btn');
	var baseClassName = document.getElementById('class_name');
	var jsonString = document.getElementById('json_string');
	var output = document.getElementById('output');	

	$('#error').hide();
	var inputString = '';	// stores the input string
	var classes = [];	// store all the classes
	var keywords = [' ', '{', '}', '[', ']', '\n', ':'];	//keywords found in the actual json string
	var finalString = '';

	$('#error_json').hide();
	
	generateBtn.onclick = function() {
		classes = [];	// make class list empty
		inputString = jsonString.value;
		output.value = '';

		// checking to see if the string is a valid json
		var jsonError = false;
		try{
			JSON.parse(inputString);
		}catch(e) {
			console.log(e);
			jsonError = true;
		}
		if(jsonError) {
			$('#error_json').show();
			return;
		}else
			$('#error_json').hide();


		// Identify the main object
		var i = 0;
		var objStart = 0, objEnd = 0, objCount = 0;
		for(i=0; i<inputString.length; i++) {
			if(inputString[i] == '{' && objCount == 0) {
				objStart = i;
				objCount = 1;
			}else if(inputString[i] == '{' && objCount > 0) {
				objCount++;
			}else if(inputString[i] == '}' && objCount > 0) {
				objCount--;
			}
			if(objCount == 0) {
				objEnd = i;
				break;
			}
		}
		makeClass(objStart+1, objEnd, baseClassName.value);

		finalString = '';
		classes.forEach(function(javaClass) {
			finalString+='public class ' + javaClass.name + ' {\n';
			javaClass.dataMembers.forEach(function(dataMember) {
				finalString+='\tpublic ' + dataMember.dataType + ' ' + dataMember.name + ';\n';
			});
			finalString+='}\n\n';
		});
		output.value = finalString;
		$('#output').trigger('autoresize');
	};

	// accept a string between the characters '{' and '}' excluding them
	makeClass = function(start, end, className) {
		// make a new class object
		var newClass = {
			"name": className
		};
		// initialize array of data members
		newClass.dataMembers = [];
		var i;
		var attrStart = -1; // index of the start of an attribute
		var attrEnd; // index of the end of an attribute
		var attrProcessed = false;	// to keep track whether the attribute has been read or not
		for(i=start; i<=end; i++) {
			if(inputString[i] == '"' && attrStart == -1 && !attrProcessed) {	//detect the start of an attribute
				attrStart = i;
			}else if(inputString[i] == '"' && attrStart != -1 && !attrProcessed) {	// detect end of attribute
				attrEnd = i;
				attrProcessed = true;	// we have detected the attribute, set it to true
			}else if(inputString[i] == '"' && attrProcessed) {	// start of a string value
				attrProcessed = false;	// set this to false for detecting further attributes
				newClass.dataMembers.push({
					"dataType": "String",
					"name": inputString.substring(attrStart+1, attrEnd)
				});
				i = processStringAndReturnLastIndex(i+1);	// get the last index of the string
				attrStart = -1;	// set this to -1 to detect further attributes
			}else if(inputString[i] != '"' && $.inArray(inputString[i], keywords) == -1 && attrProcessed) {	// number or null
				var state = 0;
				var j;
				var isNum = false;	// check whether the string is number or null
				for(j=i; j<inputString.length; j++) {
					switch(state) {
						case 0:
							if(inputString[j] == 'n' || inputString[j] == 'N') {
								state = 1;
							}else if($.inArray(inputString[j], keywords) == -1){
								isNum = true;	// if it does not start with n or N, then it is surely a number
								break;
							}
							break;
						case 1:
							if(inputString[j] == 'u' || inputString[j] == 'U') {
								state = 2;
							}else{
								state = 0;
							}
							break;
						case 2:
							if(inputString[j] == 'l' || inputString[j] == 'L') {
								state = 3;
							}else{
								state = 0;
							}
							break;
						case 3:
							if(inputString[j] == 'l' || inputString[j] == 'L') {
								state = 4;
							}else{
								state = 0;
							}
							break;
						case 4:
							if(inputString[j] == ',' || inputString[j] == ' ' || inputString[j] == '\n' || inputString[j] == '}' || inputString[j] == ']') {
								attrProcessed = false;
								newClass.dataMembers.push({
									"dataType": "Object",
									"name": inputString.substring(attrStart+1, attrEnd)
								});
								attrStart = -1;
								state = 0;
								break;
							}else{
								state = 0;
								break;
							}
							break;
					}
					if(!attrProcessed || isNum)
						break;
				}
				if(isNum) {
					var dataType = 'int';
					for(;j<inputString.length; j++) {
						if($.inArray(inputString[j], keywords) == -1){
							if(inputString[j] == '.') {
								dataType = 'float';
								break;
							}
						}else
							break;
					}
					i = j;
					newClass.dataMembers.push({
						"dataType": dataType,
						"name": inputString.substring(attrStart+1, attrEnd)
					});
					attrProcessed = false;
					attrStart = -1;
					state = 0;
				}
			}else if(inputString[i] == '{' && attrProcessed) {
				var objCount = 1;
				i++;
				var objStart = i, objEnd;
				for(;i<inputString.length; i++) {
					if(inputString[i] == '{' && objCount > 0) {
						objCount++;
					}else if(inputString[i] == '}' && objCount > 0) {
						objCount--;
					}
					if(objCount == 0) {
						objEnd = i;
						break;
					}
				}
				newClass.dataMembers.push({
					"dataType": inputString[attrStart+1].toUpperCase() + inputString.substring(attrStart+2, attrEnd),
					"name": inputString.substring(attrStart+1, attrEnd)
				});
				makeClass(objStart+1, objEnd, inputString[attrStart+1].toUpperCase() + inputString.substring(attrStart+2, attrEnd));
				attrProcessed = false;
				attrStart = -1;
				state = 0;
			}else if(inputString[i] == '[' && attrProcessed) {
				var arrayCount = 1;
				i++;
				var arrayStart = i, arrayEnd;
				for(; i<inputString.length; i++) {
					if(inputString[i] == '[' && arrayCount>0) {
						arrayCount++;
					}else if(inputString[i] == ']' && arrayCount>0) {
						arrayCount--;
					}
					if(arrayCount == 0) {
						arrayEnd = i;
						break;
					}
				}
				var arrayObj = processArray(arrayStart, arrayEnd, inputString.substring(attrStart+1, attrEnd));
				newClass.dataMembers.push({
					"dataType": "ArrayList<"+arrayObj+">",
					"name": inputString.substring(attrStart+1, attrEnd)
				});
				attrProcessed = false;
				attrStart = -1;
				state = 0;
			}
		}
		classes.push(newClass);
 	};

 	processStringAndReturnLastIndex = function(start) {
 		var i;
 		var doubleInvertedCount = 1;	// we have already discovered one ". ie start - 1
 		for(i=start; i<inputString.length; i++) {
 			if(inputString[i] == '"' && inputString[i-1] != '\\')
 				break;
 		}
 		return i;
 	};

 	processArray = function(start, end, attrName) {
 		var i;
 		if(start == end)
 			return 'Object';
 		for(i=start; i<=end; i++) {
 			if(inputString[i] == '"') {
 				return "String";
 			}else if(inputString[i] == '{') {
 				var objStart = ++i, objCount = 1, objEnd;
 				for(; i<=end; i++) {
 					if(inputString[i] == '{' && objCount>0)
 						objCount++;
 					else if(inputString[i] == '}' && objCount>0)
 						objCount--;
 					if(objCount == 0) {
 						objEnd = i;
 						break;
 					}
 				}
 				makeClass(objStart, objEnd, attrName[0].toUpperCase() + attrName.substring(1));
 				return attrName[0].toUpperCase() + attrName.substring(1);
 			}else if(!isNaN(inputString[i]) && $.inArray(inputString[i], keywords) == -1) {
 				for(var j = i; j<=end; j++) {
 					if(inputString[j] == '.')
 						return 'float';
 					if($.inArray(inputString[j], keywords) > -1)
 						break;
 				}
 				return 'int';
 			}
 		}
 	}

}