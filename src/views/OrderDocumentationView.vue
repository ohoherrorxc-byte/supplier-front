<template>
  <div class="srm-page">
    <div class="srm-card-title">订单管理文档</div>

    <a-card size="small" style="margin-bottom: 16px">
      <a-tabs v-model:activeKey="activeKey" @change="handleTabChange">
        <a-tab-pane key="overview" tab="业务愿景与系统全景图">
          <div class="doc-content">
            <h2>1. 业务愿景与系统全景图 (Business Landscape)</h2>
            <p>本模块致力于打造一个基于 S&OP（销售与运营计划）体系的供应链需求协同漏斗。系统打破了传统ERP仅下达“确切订单（PO）”的局限，将触角向前延伸至预测和计划阶段，旨在消除供应链的“牛鞭效应”，赋能供应商提前备料与排产。</p>
            <h3>需求漏斗演进路径（颗粒度由粗到细，约束力由弱到强）：</h3>
            <p>经销商历史需求 (无约束/分析) → 销售预测 (软约束/参考) → 采购计划 (中约束/需回复产能) → 确切订单/JIT (硬约束/法律契约)</p>
          </div>
        </a-tab-pane>

        <a-tab-pane key="architecture" tab="系统架构与领域模型设计指引">
          <div class="doc-content">
            <h2>2. 系统架构与领域模型设计指引 (Architecture Guidelines)</h2>
            <h3>【致架构师/DBA的强制性要求】</h3>
            <p>鉴于漏斗中各层级数据的生命周期、更新频率和业务严肃性存在本质差异，后端领域模型与数据库设计必须进行物理分表隔离：</p>
            <h4>预测与计划数据域 (Soft Constraint Domain)</h4>
            <p>特性：高频更新、滚动覆盖（如 Rolling 12 Months）。</p>
            <p>设计原则：不要求严格的行级变更审计日志。采用版本号控制（Version Control），允许新版本数据整批覆盖旧版本。</p>
            <h4>确切订单数据域 (Firm Order Domain)</h4>
            <p>特性：低频修改、强事务、法律契约。</p>
            <p>设计原则：具备严格的有限状态机（FSM）。对数量、交期、价格的任何一次修改，必须在底层 Audit_Log 留存审计痕迹。</p>
          </div>
        </a-tab-pane>

        <a-tab-pane key="modules" tab="核心子模块功能规格">
          <div class="doc-content">
            <h2>3. 核心子模块功能规格 (Module Specifications)</h2>
            
            <h3>3.1 【预测与计划协同层】 (Predictive & Planning Layer)</h3>
            <h4>3.1.1 经销商历史采购需求</h4>
            <p>业务定位：主机厂计划员的数据分析看板。</p>
            <p>前端展现：多维数据透视表与趋势图表（折线图/柱状图）。</p>
            <p>后端支撑：接入 BI/数据仓库，支持按 零件号、时间跨度、经销商区域 进行聚合查询（Group By）。</p>
            
            <h4>3.1.2 销售预测 (Sales Forecast)</h4>
            <p>业务定位：主机厂共享的“未来视图”（未来12个月滚动预测）。</p>
            <p>权限控制：供应商视角绝对只读。仅供其作为二级物料采购的参考。</p>
            <p>交互动作：仅提供列表查看、多维过滤和【导出 Excel】功能。若业务需要，可增加一键【确认收到】按钮（记录日志即可）。</p>
            
            <h4>3.1.3 采购计划 / 预订单 (Purchase Plan)</h4>
            <p>业务定位：未来 4-8 周的周度排产意向。</p>
            <p>核心协同逻辑（双向交互）：</p>
            <ul>
              <li>主机厂下发计划量（Planned_Qty）。</li>
              <li>【供应商反馈产能】：供应商必须在规定时间内填报【承诺可满足数量】（Committed_Capacity）。</li>
            </ul>
            <p>后端逻辑：若 Committed_Capacity < Planned_Qty，系统需自动触发【缺料预警】事件，推送给主机厂计划员。</p>
            
            <h3>3.2 【确切订单执行层】 (Firm Order Execution Layer)</h3>
            <h4>3.2.1 国内订单 (Standard PO)</h4>
            <p>业务定位：常规标准采购契约，驱动发货的核心模块。</p>
            <p>状态机 (State Machine)：待反馈 → 已确认 → 部分发运 → 已发运 → 已结案。</p>
            <p>核心动作：</p>
            <ul>
              <li>【供应商提交】：供应商点击确认交期，状态流转为已确认。</li>
              <li>【创建发运信息】：供应商勾选明细行生成 ASN 单据（具体逻辑见下文 4.2）。</li>
            </ul>
            
            <h4>3.2.2 国内 JIT (Just-In-Time)</h4>
            <p>业务定位：极高频、极小批量的精益拉动订单。</p>
            <p>特殊逻辑 (相较于标准PO)：</p>
            <ul>
              <li>免确认直达：接口接收后，状态直接默认为 已确认，系统禁止供应商拒绝或修改交期。</li>
              <li>精准时间窗：交期精确到时分（Datetime），如 2026-04-16 14:00-14:30。</li>
              <li>UI 区分：列表页需使用特定 Icon（如红色闪电）标识 JIT 订单。</li>
            </ul>
            
            <h4>3.2.3 委外加工业务领料单</h4>
            <p>业务定位：主机厂提供原材料，供应商负责加工的特殊场景。</p>
            <p>数据模型要求：不仅要展示“加工成品”的需求，还必须关联下挂 BOM（物料清单）明细表，清晰展示供应商需要从主机厂仓库领走的“原材料编码及数量”。</p>
            
            <h3>3.3 【特殊业务处理层】 (Special Operations)</h3>
            <h4>3.3.1 ASSR 订单 (紧急售后)</h4>
            <p>业务定位：紧急特批售后配件。</p>
            <p>系统逻辑：</p>
            <ul>
              <li>系统内优先级最高。</li>
              <li>UI 层面：整行数据使用红色高亮或特殊底色醒目标识。</li>
            </ul>
            
            <h4>3.3.2 供应商确认订单关闭</h4>
            <p>业务定位：异常/非正常结束的订单生命周期终结。</p>
            <p>交互流转：主机厂发起“强制关闭” → 状态变更为 待确认关闭 → 供应商在列表页点击【确认关闭】 → 状态变为 已关闭。</p>
            <p>业务意义：通过系统强制交互，释放供应商被锁定的产能和备料。</p>
          </div>
        </a-tab-pane>

        <a-tab-pane key="ui" tab="全局 UI 交互与前端控制规则">
          <div class="doc-content">
            <h2>4. 全局 UI 交互与前端控制规则 (UI & UX Rules)</h2>
            <p>本节定义列表页（国内订单/新订单页面）的核心交互与防呆逻辑。</p>
            
            <h3>4.1 复杂查询面板 (Search Panel)</h3>
            <p>下拉多选组件：订单状态 等字段必须支持多选。</p>
            <p>批量输入解析 (文本域 Textarea)：</p>
            <p>适用字段：系统订单号、SAP订单号、供应商Duns、零件号。</p>
            <p>前端处理逻辑：用户在此类文本域中粘贴一列数据（以换行符 \n 或逗号 , 结尾）时，前端在构建 Request Payload 前，需通过正则将其清洗、分割为 字符串数组 (Array[String])。</p>
            <p>后端处理逻辑：接收到数组后，转换为 SQL 的 IN (...) 子句进行精确批量查询。</p>
            
            <h3>4.2 【创建发运信息】按钮的激活与拦截逻辑 (Button Enablement FSM)</h3>
            <p>这是前端开发最关键的防呆节点。点击该按钮前，前端必须执行以下 AND（且） 逻辑校验：</p>
            <ul>
              <li>必选校验：所选记录数 N > 0。（否则按钮置灰或点击提示“请先勾选数据”）。</li>
              <li>状态合规校验：遍历选中的 N 条记录，其 订单状态 必须全部属于 ['已确认', '部分发运'] 集合。</li>
              <li>拦截动作：若包含 待反馈、已发运(全额)、已结案，立刻弹窗拦截：“所选订单包含不可发货状态，请重新检查”。</li>
              <li>同源/同厂校验：遍历选中的 N 条记录，提取其 送货工厂 字段。去重后，该字段的种类数必须 == 1。</li>
              <li>拦截动作：如果不等于1，立刻弹窗拦截：“所选订单的送货工厂不同，无法合并生成同一张发货单”。</li>
            </ul>
            
            <h3>4.3 单行操作区动态渲染 (Row-level Actions)</h3>
            <p>规则：前端根据行数据的 订单状态 动态渲染操作列。</p>
            <ul>
              <li>订单状态 == '待反馈' → 显示蓝底白字的 【供应商提交】 按钮。</li>
              <li>订单状态 != '待反馈' → 隐藏该按钮，或显示为置灰状态。</li>
            </ul>
          </div>
        </a-tab-pane>

        <a-tab-pane key="nfr" tab="非功能性需求与安全规范">
          <div class="doc-content">
            <h2>5. 非功能性需求与安全规范 (NFR & Security)</h2>
            
            <h3>数据隔离边界 (Tenant Isolation)</h3>
            <p>强制要求：所有的后端查询 API（如 /api/v1/orders/list），必须在底层 Service/DAO 层自动拼装 WHERE supplier_id = {当前登录用户上下文ID} 的限制条件。绝对禁止仅靠前端传参来过滤供应商数据，严防越权水平渗透。</p>
            
            <h3>大数据量批量查询优化</h3>
            <p>性能要求：当用户在“系统订单号”文本域中粘贴超过 500 个甚至 1000 个单号时，直接使用 IN (...) 可能导致慢 SQL 或数据库报错。</p>
            <p>后端策略：后端在识别到数组长度超过阈值（如 > 500）时，需采用 分批查询（Chunking）后在内存中合并，或使用 临时表 Join 的方式进行性能优化。</p>
            
            <h3>防重复提交 (Idempotency)</h3>
            <p>针对【供应商提交】、【确认订单关闭】等核心写操作 API，前后端必须配合实现幂等性控制（如：点击后按钮立即 Loading，后端校验 Token），防止因网络抖动导致的脏数据。</p>
          </div>
        </a-tab-pane>
      </a-tabs>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const activeKey = ref('overview')

function handleTabChange(key: string) {
  activeKey.value = key
}
</script>

<style scoped>
.srm-page {
  background: #f0f2f5;
  min-height: 100vh;
}

.srm-card-title {
  font-size: 20px;
  font-weight: 500;
  color: #1f1f1f;
  margin-bottom: 16px;
}

.doc-content {
  padding: 16px;
}

.doc-content h2 {
  font-size: 18px;
  font-weight: 500;
  color: #1f1f1f;
  margin-top: 0;
  margin-bottom: 16px;
}

.doc-content h3 {
  font-size: 16px;
  font-weight: 500;
  color: #1f1f1f;
  margin-top: 24px;
  margin-bottom: 12px;
}

.doc-content h4 {
  font-size: 14px;
  font-weight: 500;
  color: #1f1f1f;
  margin-top: 16px;
  margin-bottom: 8px;
}

.doc-content p {
  margin-bottom: 12px;
  line-height: 1.5;
}

.doc-content ul {
  margin-bottom: 12px;
  padding-left: 24px;
}

.doc-content li {
  margin-bottom: 4px;
}
</style>