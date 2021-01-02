/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is not neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./build/server/index.js":
/*!*******************************!*\
  !*** ./build/server/index.js ***!
  \*******************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

eval("\r\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\r\nconst libfs = __webpack_require__(/*! fs */ \"fs\");\r\nfunction decompressRecord(archive, cursor) {\r\n    let header = archive.readUInt32LE(cursor);\r\n    cursor += 4;\r\n    let decompressedSize = (header >> 0) & 0xFFFFFF;\r\n    let isCompressed = (header >> 29) & 1;\r\n    if (!isCompressed) {\r\n        return archive.slice(cursor, cursor + decompressedSize);\r\n    }\r\n    let buffer = Buffer.alloc(decompressedSize);\r\n    let bytesWritten = 0;\r\n    let history = Buffer.alloc(4096);\r\n    let historyPosition = 0;\r\n    let controlByte = 0;\r\n    let controlShift = 8;\r\n    function append(byte) {\r\n        buffer[bytesWritten] = byte;\r\n        bytesWritten += 1;\r\n        history[historyPosition] = byte;\r\n        historyPosition = (historyPosition + 1) & 4095;\r\n    }\r\n    while (bytesWritten < buffer.length) {\r\n        if (controlShift >= 8) {\r\n            controlByte = archive.readUInt8(cursor);\r\n            cursor += 1;\r\n            controlShift = 0;\r\n        }\r\n        let bit = (controlByte >> controlShift) & 1;\r\n        controlShift += 1;\r\n        if (bit) {\r\n            let byte = archive.readUInt8(cursor);\r\n            cursor += 1;\r\n            append(byte);\r\n        }\r\n        else {\r\n            let header = archive.readUInt16LE(cursor);\r\n            cursor += 2;\r\n            let offset = (header >> 0) & 4095;\r\n            let length = (header >> 12) & 15;\r\n            for (let i = offset; i < offset + length + 3; i++) {\r\n                let byte = history[i & 4095];\r\n                append(byte);\r\n            }\r\n        }\r\n    }\r\n    return buffer;\r\n}\r\nfunction extract(source, target) {\r\n    libfs.mkdirSync(target, { recursive: true });\r\n    let archive = libfs.readFileSync(source);\r\n    let cursor = 0;\r\n    let version = archive.readUInt32LE(cursor);\r\n    cursor += 4;\r\n    let recordCount = archive.readUInt32LE(cursor);\r\n    cursor += 4;\r\n    for (let i = 0; i < recordCount; i++) {\r\n        let offset = archive.readUInt32LE(cursor);\r\n        cursor += 4;\r\n        let buffer = decompressRecord(archive, offset);\r\n        libfs.writeFileSync(`${target}${i.toString().padStart(3, \"0\")}`, buffer);\r\n    }\r\n}\r\nfunction pack(source, target) {\r\n    let entries = libfs.readdirSync(source, { withFileTypes: true })\r\n        .filter((entry) => entry.isFile())\r\n        .sort((one, two) => one.name.localeCompare(two.name));\r\n    let header = Buffer.alloc(8);\r\n    header.writeUInt32LE(24, 0);\r\n    header.writeUInt32LE(entries.length, 4);\r\n    let fd = libfs.openSync(target, \"w\");\r\n    libfs.writeSync(fd, header);\r\n    let offset = Buffer.alloc(4);\r\n    offset.writeUInt32LE(8 + 4 * entries.length);\r\n    for (let entry of entries) {\r\n        libfs.writeSync(fd, offset);\r\n        let stat = libfs.statSync(`${source}${entry.name}`);\r\n        offset.writeUInt32LE(offset.readUInt32LE(0) + 4 + stat.size, 0);\r\n    }\r\n    for (let entry of entries) {\r\n        let record = libfs.readFileSync(`${source}${entry.name}`);\r\n        offset.writeUInt32LE(record.length, 0);\r\n        libfs.writeSync(fd, offset);\r\n        libfs.writeSync(fd, record);\r\n    }\r\n    libfs.closeSync(fd);\r\n}\r\nlet command = process.argv[2];\r\nif (command === \"extract\") {\r\n    extract(\"./private/data.war.original\", \"./private/records/\");\r\n}\r\nelse if (command === \"pack\") {\r\n    pack(\"./private/records/\", \"c:/dos/warcraft/data/data.war\");\r\n}\r\nelse {\r\n    console.log(\"Please specify command.\");\r\n}\r\n\n\n//# sourceURL=webpack://@joelek/webcraft/./build/server/index.js?");

/***/ }),

/***/ "fs":
/*!*********************!*\
  !*** external "fs" ***!
  \*********************/
/***/ ((module) => {

eval("module.exports = require(\"fs\");;\n\n//# sourceURL=webpack://@joelek/webcraft/external_%22fs%22?");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		if(__webpack_module_cache__[moduleId]) {
/******/ 			return __webpack_module_cache__[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	// startup
/******/ 	// Load entry module
/******/ 	__webpack_require__("./build/server/index.js");
/******/ 	// This entry module used 'exports' so it can't be inlined
/******/ })()
;