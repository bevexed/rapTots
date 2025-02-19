export type IData = {
  itf: Itf;
  properties: Property[];
}

export type Itf = {
  id: number;
  name: string;
  url: string;
  method: string;
  bodyOption: string;
  description: string;
  priority: number;
  status: number;
  creatorId: number;
  lockerId: null;
  moduleId: number;
  repositoryId: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: null;
}

export type Property = {
  id: number;
  scope: Scope;
  type: Type;
  pos: number;
  name: string;
  rule: null | string;
  value: null | string;
  description: string;
  parentId: number | -1;
  priority: number;
  interfaceId: number;
  creatorId: number | null;
  moduleId: number;
  repositoryId: number;
  required: boolean | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: null;
}

type Tree = Property & { children: Tree[] }

export type Scope =
  | "request"
  | "response"


export enum Type {
  Boolean = "boolean",
  Null = "null",
  Number = "number",
  Object = "object",
  String = "string",
}

function capitalizeFirstLetter(str: string): string {
  if (str.length === 0) {
    return str;
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
}

document.addEventListener("DOMContentLoaded", function () {
  const inputJson = document.getElementById("inputJson") as HTMLTextAreaElement;
  const outputTs = document.getElementById("outputTs") as HTMLTextAreaElement;
  const convertParamsButton = document.getElementById("convertParams") as HTMLButtonElement;
  const convertResponseButton = document.getElementById("convertResponse") as HTMLButtonElement;
  const copyButton = document.getElementById("copy") as HTMLButtonElement;
  const fileInput = document.getElementById("fileInput") as HTMLInputElement;
  const dragDropArea = document.getElementById("dragDropArea") as HTMLDivElement;

  // 处理文件选择按钮点击事件
  fileInput.addEventListener("change", handleFileChange);

  // 处理拖放事件
  dragDropArea.addEventListener("dragover", (e: DragEvent) => {
    e.preventDefault();
    dragDropArea.style.borderColor = "#007bff";
  });

  dragDropArea.addEventListener("dragleave", () => {
    dragDropArea.style.borderColor = "#ccc";
  });

  dragDropArea.addEventListener("drop", (e: DragEvent) => {
    e.preventDefault();
    dragDropArea.style.borderColor = "#ccc";
    const files = e.dataTransfer?.files;
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

  function handleFileChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      handleFile(file);
    }
  }

  function handleFile(file: File): void {
    if (!file) {
      alert("请选择一个有效的文件");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      const content = e.target?.result;
      if (typeof content !== "string") {
        alert("文件内容格式不正确");
        return;
      }
      inputJson.value = content;
      outputTs.value =
        `
        ${ formattingTs(inputJson.value, 'request') }
        ${ formattingTs(inputJson.value, 'response') }
        ${ generateAjax(inputJson.value) }
      `;
    };

    reader.onerror = (e: ProgressEvent<FileReader>) => {
      console.error("文件读取错误:", e);
      alert("文件读取失败，请重试");
    };

    reader.readAsText(file);
  }

  const getTree = (source: Property[]) => {
    const parentMap = new Map<number,Tree>();
    const childrenMap = new Map<number, Tree[]>()
    for (const item of source) {
      if (item.parentId === -1) {
        parentMap.set(item.id,{ ...item, children: [] });
        continue;
      }
      if (childrenMap.has(item.parentId)) {
        childrenMap.set(item.parentId, childrenMap.get(item.parentId)!.concat({ ...item, children: [] }))
      } else {
        childrenMap.set(item.parentId, [{ ...item, children: [] }])
      }
    }

    for (const [parentId,childElements] of childrenMap) {
      if (!parentMap.has(parentId)) {
        const parent = source.find((item) => item.id === parentId)
        if (parent) {
          parentMap.set(parent.id, { ...parent, children: childElements })
        }
      }
    }

    for (const [parentId,parentElement] of parentMap) {
      if (childrenMap.has(parentId)) {
        parentElement.children = childrenMap.get(parentId) ?? [];
        childrenMap.delete(parentId)
      }
    }
    return [...parentMap.values()];
  }

  const getType = (type: string, name: string, typeSuffix: string): string => {
    switch (type) {
      case "String":
      case "Number":
      case "Boolean":
      case "Null":
        return type.toLowerCase();
      case "Array":
        return `I${ name }${ typeSuffix }[]`;
      case "Object":
        return `I${ name }${ typeSuffix }`;
      default:
        return "any"; // 待改进
    }
  };

  function formattingTs(source: string, formatType: 'request' | 'response') {
    let temp = {} as IData;
    try {
      temp = JSON.parse(source);
    } catch (err) {
      alert("json格式错误");
      return "";
    }


    const interfaceName = temp?.itf?.name ?? "Name";
    const urlPart = (capitalizeFirstLetter(temp?.itf?.url.split("/").pop() ?? "") ?? "Name");

    const generateType = (source: Tree[], typeName: string, scope: 'request' | 'response' | string): string => {
      if (source.length === 0) {
        return ''
      }

      const typeSuffix = capitalizeFirstLetter(formatType);
      let typeContent = `export type I${ typeName }${ typeSuffix } = {\n`;

      const childrenMap = new Map<string, Tree[]>()
      for (let i = 0; i < source.length; i++) {
        const item = source[i];
        const parent = temp.properties.find(i=>i.id === item.parentId) || {name:''}
        const InterFaceName = `${capitalizeFirstLetter(parent.name) + capitalizeFirstLetter(item.name) }`
        if (item["scope"] === scope) {
          const type = getType(item["type"], InterFaceName, typeSuffix);
          typeContent += `  ${ item["name"] }: ${ type };// ${ item["description"] || item['value'] }\n`;
          if (item.children.length > 0) {
            childrenMap.set(InterFaceName, item.children)
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

    return `// ${ interfaceName } ${formatType}\n ` + generateType(getTree(temp.properties), urlPart, formatType);
  }

  const generateAjax = (e: string) => {
    let temp: any = {};
    try {
      temp = JSON.parse(e);
    } catch (err) {
      alert("json格式错误");
      return "";
    }
    const interfaceName = temp?.itf?.name ?? "Name";
    const urlPart = (capitalizeFirstLetter(temp?.itf?.url.split("/").pop() ?? "") ?? "Name");

    const url = temp?.itf?.url ?? "";

    return `//${ interfaceName }request \n export const ajax${ urlPart } = (params: I${ urlPart }Request) => request.post<I${ urlPart }Response>({url: '${ url }',params});`
  };

  copyButton.addEventListener("click", copyToClipboard);

  async function copyToClipboard() {
    const textarea = document.getElementById('outputTs') as HTMLTextAreaElement;
    if (textarea) {
      try {
        await navigator.clipboard.writeText(textarea.value);
        // alert('文本已复制到剪贴板');
      } catch (err) {
        console.error('复制失败: ', err);
        alert('复制失败，请重试');
      }
    } else {
      alert('未找到指定的 textarea 元素');
    }
  }
});
