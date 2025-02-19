var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
export var Type;
(function (Type) {
    Type["Boolean"] = "boolean";
    Type["Null"] = "null";
    Type["Number"] = "number";
    Type["Object"] = "object";
    Type["String"] = "string";
})(Type || (Type = {}));
function capitalizeFirstLetter(str) {
    if (str.length === 0) {
        return str;
    }
    return str.charAt(0).toUpperCase() + str.slice(1);
}
document.addEventListener("DOMContentLoaded", function () {
    const inputJson = document.getElementById("inputJson");
    const outputTs = document.getElementById("outputTs");
    const convertParamsButton = document.getElementById("convertParams");
    const convertResponseButton = document.getElementById("convertResponse");
    const copyButton = document.getElementById("copy");
    const fileInput = document.getElementById("fileInput");
    const dragDropArea = document.getElementById("dragDropArea");
    // 处理文件选择按钮点击事件
    fileInput.addEventListener("change", handleFileChange);
    // 处理拖放事件
    dragDropArea.addEventListener("dragover", (e) => {
        e.preventDefault();
        dragDropArea.style.borderColor = "#007bff";
    });
    dragDropArea.addEventListener("dragleave", () => {
        dragDropArea.style.borderColor = "#ccc";
    });
    dragDropArea.addEventListener("drop", (e) => {
        var _a;
        e.preventDefault();
        dragDropArea.style.borderColor = "#ccc";
        const files = (_a = e.dataTransfer) === null || _a === void 0 ? void 0 : _a.files;
        if (files && files.length > 0) {
            handleFile(files[0]);
        }
    });
    convertParamsButton.addEventListener("click", () => {
        outputTs.value = formattingTs(inputJson.value, 'request');
    });
    convertResponseButton.addEventListener("click", () => {
        outputTs.value = formattingTs(inputJson.value, 'response');
    });
    function handleFileChange(event) {
        var _a;
        const file = (_a = event.target.files) === null || _a === void 0 ? void 0 : _a[0];
        if (file) {
            handleFile(file);
        }
    }
    function handleFile(file) {
        if (!file) {
            alert("请选择一个有效的文件");
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            var _a;
            const content = (_a = e.target) === null || _a === void 0 ? void 0 : _a.result;
            if (typeof content !== "string") {
                alert("文件内容格式不正确");
                return;
            }
            inputJson.value = content;
            outputTs.value =
                `
        ${formattingTs(inputJson.value, 'request')}
        ${formattingTs(inputJson.value, 'response')}
        ${generateAjax(inputJson.value)}
      `;
        };
        reader.onerror = (e) => {
            console.error("文件读取错误:", e);
            alert("文件读取失败，请重试");
        };
        reader.readAsText(file);
    }
    const getTree = (source) => {
        var _a;
        const parentMap = new Map();
        const childrenMap = new Map();
        for (const item of source) {
            if (item.parentId === -1) {
                parentMap.set(item.id, Object.assign(Object.assign({}, item), { children: [] }));
                continue;
            }
            if (childrenMap.has(item.parentId)) {
                childrenMap.set(item.parentId, childrenMap.get(item.parentId).concat(Object.assign(Object.assign({}, item), { children: [] })));
            }
            else {
                childrenMap.set(item.parentId, [Object.assign(Object.assign({}, item), { children: [] })]);
            }
        }
        for (const [parentId, childElements] of childrenMap) {
            if (!parentMap.has(parentId)) {
                const parent = source.find((item) => item.id === parentId);
                if (parent) {
                    parentMap.set(parent.id, Object.assign(Object.assign({}, parent), { children: childElements }));
                }
            }
        }
        for (const [parentId, parentElement] of parentMap) {
            if (childrenMap.has(parentId)) {
                parentElement.children = (_a = childrenMap.get(parentId)) !== null && _a !== void 0 ? _a : [];
                childrenMap.delete(parentId);
            }
        }
        return [...parentMap.values()];
    };
    const getType = (type, name, typeSuffix) => {
        switch (type) {
            case "String":
            case "Number":
            case "Boolean":
            case "Null":
                return type.toLowerCase();
            case "Array":
                return `I${name}${typeSuffix}[]`;
            case "Object":
                return `I${name}${typeSuffix}`;
            default:
                return "any"; // 待改进
        }
    };
    function formattingTs(source, formatType) {
        var _a, _b, _c, _d, _e;
        let temp = {};
        try {
            temp = JSON.parse(source);
        }
        catch (err) {
            alert("json格式错误");
            return "";
        }
        const interfaceName = (_b = (_a = temp === null || temp === void 0 ? void 0 : temp.itf) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : "Name";
        const urlPart = ((_e = capitalizeFirstLetter((_d = (_c = temp === null || temp === void 0 ? void 0 : temp.itf) === null || _c === void 0 ? void 0 : _c.url.split("/").pop()) !== null && _d !== void 0 ? _d : "")) !== null && _e !== void 0 ? _e : "Name");
        const generateType = (source, typeName, scope) => {
            if (source.length === 0) {
                return '';
            }
            const typeSuffix = capitalizeFirstLetter(formatType);
            let typeContent = `export type I${typeName}${typeSuffix} = {\n`;
            const childrenMap = new Map();
            for (let i = 0; i < source.length; i++) {
                const item = source[i];
                const base64 = btoa(item.parentId.toString());
                const InterFaceName = `${capitalizeFirstLetter(item.name)}_${base64}_`;
                if (item["scope"] === scope) {
                    const type = getType(item["type"], InterFaceName, typeSuffix);
                    typeContent += `  ${item["name"]}: ${type};// ${item["description"] || item['value']}\n`;
                    if (item.children.length > 0) {
                        childrenMap.set(InterFaceName, item.children);
                    }
                }
            }
            typeContent += "};\n";
            if (childrenMap.size > 0) {
                childrenMap.forEach((children, parentName) => {
                    typeContent += generateType(children, parentName, formatType);
                });
            }
            return typeContent;
        };
        return `// ${interfaceName} ${formatType}\n ` + generateType(getTree(temp.properties), urlPart, formatType);
    }
    const generateAjax = (e) => {
        var _a, _b, _c, _d, _e, _f, _g;
        let temp = {};
        try {
            temp = JSON.parse(e);
        }
        catch (err) {
            alert("json格式错误");
            return "";
        }
        const interfaceName = (_b = (_a = temp === null || temp === void 0 ? void 0 : temp.itf) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : "Name";
        const urlPart = ((_e = capitalizeFirstLetter((_d = (_c = temp === null || temp === void 0 ? void 0 : temp.itf) === null || _c === void 0 ? void 0 : _c.url.split("/").pop()) !== null && _d !== void 0 ? _d : "")) !== null && _e !== void 0 ? _e : "Name");
        const url = (_g = (_f = temp === null || temp === void 0 ? void 0 : temp.itf) === null || _f === void 0 ? void 0 : _f.url) !== null && _g !== void 0 ? _g : "";
        return `//${interfaceName}request \n export const ajax${urlPart} = (params: I${urlPart}Request) => request.post<I${urlPart}Response>({url: '${url}',params});`;
    };
    copyButton.addEventListener("click", copyToClipboard);
    function copyToClipboard() {
        return __awaiter(this, void 0, void 0, function* () {
            const textarea = document.getElementById('outputTs');
            if (textarea) {
                try {
                    yield navigator.clipboard.writeText(textarea.value);
                    // alert('文本已复制到剪贴板');
                }
                catch (err) {
                    console.error('复制失败: ', err);
                    alert('复制失败，请重试');
                }
            }
            else {
                alert('未找到指定的 textarea 元素');
            }
        });
    }
});
//# sourceMappingURL=rapTots.js.map