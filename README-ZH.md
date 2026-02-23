<p align="center">
<img src=".github/assets/m2dicn.png" alt="Motiv2D" width="120" height="120" />
</p>

<h1 align="center">Motiv2D</h1>

<p align="center"> <strong>高性能 Spine 动画查看器</strong>
<br/>
 一款专为 Spine 资产预览、管理和批量导入设计的工具。
<br/>
 基于 Go, Wails 和 Svelte 构建，追求极致效率。 

 </p>

<p align="center">
<a href="[https://github.com/o0Nomar0o/Motiv2d/releases](https://github.com/o0Nomar0o/Motiv2d/releases)">
<img src="[https://img.shields.io/github/downloads/o0Nomar0o/Motiv2d/total?style=flat&color=blue](https://img.shields.io/github/downloads/o0Nomar0o/Motiv2d/total?style=flat&color=blue)" alt="下载量" />
</a>
<a href="[https://github.com/o0Nomar0o/Motiv2d/releases/latest](https://github.com/o0Nomar0o/Motiv2d/releases/latest)">
<img src="[https://img.shields.io/github/v/release/o0Nomar0o/Motiv2d?style=flat](https://img.shields.io/github/v/release/o0Nomar0o/Motiv2d?style=flat)" alt="最新版本" />
</a>
<a href="[https://github.com/o0Nomar0o/Motiv2d/blob/main/LICENSE](https://github.com/o0Nomar0o/Motiv2d/blob/main/LICENSE)">
<img src="[https://img.shields.io/github/license/o0Nomar0o/Motiv2d?style=flat](https://img.shields.io/github/license/o0Nomar0o/Motiv2d?style=flat)" alt="许可证" />
</a>
</p>

<p align="center">
<a href="#功能特性">功能特性</a> •
<a href="#路线图">路线图</a> •
<a href="#技术栈">技术栈</a> •
<a href="#下载">下载</a> •
<a href="#开发指南">开发指南</a>
</p>

---

## 核心初衷

目前市面上缺乏支持 macOS 且具备 **高效快捷键** 的原生 Spine 查看器。手动隐藏图层非常耗时，因此我开发了 Motiv2D。它支持通过快捷键快速切换动画与角色，极大提升了资产查阅效率。

## 功能特性

### 工具能力

* **图层吸管 (Layer Eye-Dropper)**：直接在视口中点击动画的任意部分，即可瞬间识别并定位对应的图层名称。
* **智能检测**：自动检测并修复 `.skel` 文件中的伪造文件头或垃圾数据。自动识别二进制 `.skel` 还是 JSON 格式。
* **图层过滤**：支持使用 `||` (或) 运算符进行多关键词搜索（例如：`sky || background`）。
* **批量图层控制**：一键隐藏或显示所有过滤出的图层。

### 远程与存储

* **配置共享**：支持通过分享码导入/导出远程存储配置，实现资产库快速迁移。
* **混合抓取**：结合 **jsDelivr** 和 **GitHub API** 进行高效资产检索。
* **持久化本地缓存**：获取的资产会缓存在本地以提升性能；下载的资产将永久保留直至手动删除。

#### 示例导入代码 (以 Brown Dust 2 为例)

复制以下代码并粘贴到应用内的 "Import Code" 输入框中：

```
M2D:eyJuIjoiQnJvd24gRHVzdCAyIiwicCI6Im8wTm9tYXIwby9Ccm93bi1EdXN0LTItQXNzZXQvbWFzdGVyIiwibSI6MCwiZiI6W10sInUiOiJodHRwczovL3Jhdy5naXRodWJ1c2VyY29udGVudC5jb20vbzBOb21hcjBvL0Jyb3duLUR1c3QtMi1Bc3NldC9tYXN0ZXIvQ2hhckluZm8uanNvbiJ9

```

---

## 路线图

### 资产处理与运行库

* **版本扩展**：新增对 **Spine 3.7, 4.0, 4.1** 以及最新的 **4.2** 运行库的支持。
* **图像纠正**：实现纹理图片自动裁剪以匹配 `.atlas` 尺寸，修复网格显示异常。
* **Live2D 集成**：实现 **Live2D Cubism** (.moc3) 查看功能。

### 提取功能

---

## 技术栈

| 层级 | 技术 |
| --- | --- |
| **框架** | [Wails v2](https://wails.io/) |
| **后端** | [Go](https://go.dev/) |
| **前端** | [Svelte](https://svelte.dev/) & TypeScript |
| **核心库** | [Spine Runtimes (Esoteric Software)](https://esotericsoftware.com/spine-runtimes) |

---

## 下载

| 平台 | 状态 |
| --- | --- |
| **macOS** | [下载最新版本](https://github.com/o0Nomar0o/Motiv2D/releases) |
| **Windows** | [下载最新版本](https://github.com/o0Nomar0o/Motiv2D/releases) |

---

## 开发指南

**前置要求:** [Go 1.21+](https://go.dev/), [Node.js](https://nodejs.org/), [Wails CLI](https://wails.io/docs/gettingstarted/installation).

```
# 克隆仓库
git clone https://github.com/o0Nomar0o/Motiv2D.git
cd Motiv2d

# 启动开发模式
wails dev

```

---

## 许可证

基于 MIT 许可证开源 — 详见 [LICENSE](https://github.com/o0Nomar0o/Motiv2D/blob/main/LICENSE) 文件。

---

<p align="center"> 为 Spine 社区倾情打造 ❤️ </p>
