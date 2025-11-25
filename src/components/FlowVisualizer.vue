<template>
  <div>
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between pa-4">
        <div class="d-flex align-center">
          <v-icon icon="mdi-graph" class="mr-2" color="primary" />
          <span class="text-h5">Transfer Flow Visualizer</span>
        </div>
        <div class="d-flex gap-2">
          <v-btn
            icon="mdi-refresh"
            variant="text"
            @click="loadFlowData"
            :loading="loading"
          />
          <v-btn
            icon="mdi-fullscreen"
            variant="text"
            @click="toggleFullscreen"
          />
        </div>
      </v-card-title>

      <v-alert
        v-if="error"
        type="error"
        variant="tonal"
        class="ma-4"
        closable
        @click:close="error = null"
      >
        {{ error }}
      </v-alert>

      <v-card-text>
        
        <v-row class="mb-4">
          <v-col cols="12" md="3">
            <v-select
              v-model="flowType"
              :items="flowTypes"
              label="Flow Type"
              variant="outlined"
              density="comfortable"
              @update:model-value="loadFlowData"
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field
              v-model="focusAccount"
              label="Focus Account"
              variant="outlined"
              density="comfortable"
              clearable
              hint="Enter account ID or alias"
              persistent-hint
            />
          </v-col>
          <v-col cols="12" md="2">
            <v-text-field
              v-model.number="maxDepth"
              label="Max Depth"
              type="number"
              variant="outlined"
              density="comfortable"
              :min="1"
              :max="5"
            />
          </v-col>
          <v-col cols="12" md="2">
            <v-text-field
              v-model.number="minAmount"
              label="Min Amount"
              type="number"
              variant="outlined"
              density="comfortable"
            />
          </v-col>
          <v-col cols="12" md="2">
            <v-btn color="primary" block @click="applyFilters"> Apply </v-btn>
          </v-col>
        </v-row>

        
        <v-card variant="outlined" class="mb-4">
          <div ref="canvasContainer" class="flow-canvas-container">
            <canvas
              ref="flowCanvas"
              @mousedown="handleMouseDown"
              @mousemove="handleMouseMove"
              @mouseup="handleMouseUp"
              @wheel="handleWheel"
            ></canvas>
          </div>
        </v-card>

        
        <v-row>
          <v-col cols="12" md="6">
            <v-card variant="outlined">
              <v-card-title>Legend</v-card-title>
              <v-card-text>
                <v-row>
                  <v-col cols="6">
                    <div class="d-flex align-center mb-2">
                      <div class="legend-box" style="background: #4caf50"></div>
                      <span class="ml-2">Source Account</span>
                    </div>
                    <div class="d-flex align-center mb-2">
                      <div class="legend-box" style="background: #2196f3"></div>
                      <span class="ml-2">Intermediate Account</span>
                    </div>
                    <div class="d-flex align-center">
                      <div class="legend-box" style="background: #ff9800"></div>
                      <span class="ml-2">Destination Account</span>
                    </div>
                  </v-col>
                  <v-col cols="6">
                    <div class="d-flex align-center mb-2">
                      <div class="legend-line" style="border-color: #666"></div>
                      <span class="ml-2">Transfer Flow</span>
                    </div>
                    <div class="d-flex align-center mb-2">
                      <div
                        class="legend-line thick"
                        style="border-color: #f44336"
                      ></div>
                      <span class="ml-2">High Volume</span>
                    </div>
                    <div class="text-caption text-grey">
                      Line thickness = transfer amount
                    </div>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" md="6">
            <v-card variant="outlined">
              <v-card-title>Flow Statistics</v-card-title>
              <v-card-text>
                <v-row>
                  <v-col cols="6">
                    <div class="text-caption text-grey">Total Nodes</div>
                    <div class="text-h6">{{ flowStats.totalNodes }}</div>
                  </v-col>
                  <v-col cols="6">
                    <div class="text-caption text-grey">Total Edges</div>
                    <div class="text-h6">{{ flowStats.totalEdges }}</div>
                  </v-col>
                  <v-col cols="6">
                    <div class="text-caption text-grey">Total Flow</div>
                    <div class="text-h6">
                      {{ formatAmount(flowStats.totalFlow) }}
                    </div>
                  </v-col>
                  <v-col cols="6">
                    <div class="text-caption text-grey">Avg Hops</div>
                    <div class="text-h6">
                      {{ flowStats.avgHops.toFixed(1) }}
                    </div>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        
        <v-card v-if="selectedNode" variant="outlined" class="mt-4">
          <v-card-title>Account Details</v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="12" md="6">
                <div class="text-caption text-grey mb-1">Alias</div>
                <div class="text-body-1 mb-3">{{ selectedNode.alias }}</div>

                <div class="text-caption text-grey mb-1">Account ID</div>
                <div class="text-body-2 font-mono mb-3">
                  {{ selectedNode.id }}
                </div>

                <div class="text-caption text-grey mb-1">Balance</div>
                <v-chip
                  :color="getBalanceColor(selectedNode.balance)"
                  size="small"
                >
                  {{ formatAmount(selectedNode.balance) }}
                </v-chip>
              </v-col>
              <v-col cols="12" md="6">
                <div class="text-caption text-grey mb-1">
                  Incoming Transfers
                </div>
                <div class="text-body-1 mb-3">
                  {{ selectedNode.incomingCount }}
                </div>

                <div class="text-caption text-grey mb-1">
                  Outgoing Transfers
                </div>
                <div class="text-body-1 mb-3">
                  {{ selectedNode.outgoingCount }}
                </div>

                <div class="text-caption text-grey mb-1">Total Volume</div>
                <div class="text-body-1">
                  {{ formatAmount(selectedNode.totalVolume) }}
                </div>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        
        <v-alert type="info" variant="tonal" class="mt-4">
          <div class="text-subtitle-2 mb-2">Controls</div>
          <ul class="text-body-2">
            <li><strong>Click & Drag:</strong> Pan the view</li>
            <li><strong>Mouse Wheel:</strong> Zoom in/out</li>
            <li><strong>Click Node:</strong> View account details</li>
            <li><strong>Double Click:</strong> Focus on account</li>
          </ul>
        </v-alert>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { formatTBAmount, isPositiveTBAmount } from "@/utils/bigint";
import { onMounted, onUnmounted, ref, watch } from "vue";

interface Props {
  isConnected: boolean;
}

const props = defineProps<Props>();

interface FlowNode {
  id: string;
  alias: string;
  balance: string;
  x: number;
  y: number;
  incomingCount: number;
  outgoingCount: number;
  totalVolume: string;
  type: "source" | "intermediate" | "destination";
}

interface FlowEdge {
  from: string;
  to: string;
  amount: string;
  weight: number;
}

const loading = ref(false);
const error = ref<string | null>(null);
const flowType = ref("all");
const focusAccount = ref("");
const maxDepth = ref(3);
const minAmount = ref(0);

const flowCanvas = ref<HTMLCanvasElement>();
const canvasContainer = ref<HTMLDivElement>();
const selectedNode = ref<FlowNode | null>(null);

const nodes = ref<FlowNode[]>([]);
const edges = ref<FlowEdge[]>([]);

const flowStats = ref({
  totalNodes: 0,
  totalEdges: 0,
  totalFlow: "0",
  avgHops: 0,
});

const flowTypes = [
  { title: "All Transfers", value: "all" },
  { title: "Incoming Only", value: "incoming" },
  { title: "Outgoing Only", value: "outgoing" },
  { title: "Circular Flows", value: "circular" },
];


let ctx: CanvasRenderingContext2D | null = null;
let scale = 1;
let offsetX = 0;
let offsetY = 0;
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

watch(
  () => props.isConnected,
  (connected) => {
    if (connected) {
      loadFlowData();
    }
  }
);

onMounted(() => {
  if (flowCanvas.value) {
    ctx = flowCanvas.value.getContext("2d");
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
  }

  if (props.isConnected) {
    loadFlowData();
  }
});

onUnmounted(() => {
  window.removeEventListener("resize", resizeCanvas);
});

function resizeCanvas() {
  if (!flowCanvas.value || !canvasContainer.value) return;

  const container = canvasContainer.value;
  flowCanvas.value.width = container.clientWidth;
  flowCanvas.value.height = container.clientHeight;

  renderFlow();
}

async function loadFlowData() {
  if (!props.isConnected) return;

  loading.value = true;
  error.value = null;

  try {
    const [accountsResult, transfersResult] = await Promise.all([
      window.tigerBeetleApi.getAccounts(1000, 0),
      window.tigerBeetleApi.getTransfers(1000, 0),
    ]);

    if (accountsResult.success && transfersResult.success) {
      const accountsData = accountsResult.data;
      const transfersData = transfersResult.data;

      const accounts =
        accountsData && "data" in accountsData
          ? accountsData.data
          : (accountsData as any[]) || [];
      const transfers =
        transfersData && "data" in transfersData
          ? transfersData.data
          : (transfersData as any[]) || [];

      buildFlowGraph(accounts, transfers);
      renderFlow();
    } else {
      error.value =
        accountsResult.error || transfersResult.error || "Failed to load data";
    }
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : "Failed to load flow data";
  } finally {
    loading.value = false;
  }
}

function buildFlowGraph(accounts: any[], transfers: any[]) {
  const accountMap = new Map(accounts.map((a) => [a.id, a]));
  const nodeMap = new Map<string, FlowNode>();
  const edgeList: FlowEdge[] = [];

  
  let filteredTransfers = transfers;
  if (focusAccount.value) {
    filteredTransfers = transfers.filter(
      (t) =>
        t.debit_account_id === focusAccount.value ||
        t.credit_account_id === focusAccount.value ||
        t.debit_alias === focusAccount.value ||
        t.credit_alias === focusAccount.value
    );
  }

  if (minAmount.value > 0) {
    filteredTransfers = filteredTransfers.filter(
      (t) => Number(BigInt(t.amount || "0") / BigInt(100)) >= minAmount.value
    );
  }

  
  filteredTransfers.forEach((transfer) => {
    const debitId = transfer.debit_account_id;
    const creditId = transfer.credit_account_id;

    
    if (!nodeMap.has(debitId)) {
      const account = accountMap.get(debitId);
      nodeMap.set(debitId, {
        id: debitId,
        alias: account?.alias || debitId.substring(0, 12),
        balance: account?.balance || "0",
        x: 0,
        y: 0,
        incomingCount: 0,
        outgoingCount: 0,
        totalVolume: "0",
        type: "intermediate",
      });
    }

    if (!nodeMap.has(creditId)) {
      const account = accountMap.get(creditId);
      nodeMap.set(creditId, {
        id: creditId,
        alias: account?.alias || creditId.substring(0, 12),
        balance: account?.balance || "0",
        x: 0,
        y: 0,
        incomingCount: 0,
        outgoingCount: 0,
        totalVolume: "0",
        type: "intermediate",
      });
    }

    
    const debitNode = nodeMap.get(debitId)!;
    const creditNode = nodeMap.get(creditId)!;
    debitNode.outgoingCount++;
    creditNode.incomingCount++;

    const amount = BigInt(transfer.amount || "0");
    debitNode.totalVolume = (BigInt(debitNode.totalVolume) + amount).toString();
    creditNode.totalVolume = (
      BigInt(creditNode.totalVolume) + amount
    ).toString();

    
    edgeList.push({
      from: debitId,
      to: creditId,
      amount: transfer.amount,
      weight: Number(amount / BigInt(100)),
    });
  });

  
  nodeMap.forEach((node) => {
    if (node.outgoingCount > 0 && node.incomingCount === 0) {
      node.type = "source";
    } else if (node.incomingCount > 0 && node.outgoingCount === 0) {
      node.type = "destination";
    }
  });

  
  const nodeList = Array.from(nodeMap.values());
  layoutNodes(nodeList);

  nodes.value = nodeList;
  edges.value = edgeList;

  
  const totalFlow = edgeList.reduce(
    (sum, e) => sum + BigInt(e.amount),
    BigInt(0)
  );
  flowStats.value = {
    totalNodes: nodeList.length,
    totalEdges: edgeList.length,
    totalFlow: totalFlow.toString(),
    avgHops: nodeList.length > 0 ? edgeList.length / nodeList.length : 0,
  };
}

function layoutNodes(nodeList: FlowNode[]) {
  if (!flowCanvas.value) return;

  const width = flowCanvas.value.width;
  const height = flowCanvas.value.height;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 3;

  
  nodeList.forEach((node, index) => {
    const angle = (index / nodeList.length) * 2 * Math.PI;
    node.x = centerX + radius * Math.cos(angle);
    node.y = centerY + radius * Math.sin(angle);
  });
}

function renderFlow() {
  if (!ctx || !flowCanvas.value) return;

  const width = flowCanvas.value.width;
  const height = flowCanvas.value.height;

  
  ctx.clearRect(0, 0, width, height);

  
  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  
  edges.value.forEach((edge) => {
    const fromNode = nodes.value.find((n) => n.id === edge.from);
    const toNode = nodes.value.find((n) => n.id === edge.to);

    if (fromNode && toNode) {
      const maxWeight = Math.max(...edges.value.map((e) => e.weight), 1);
      const lineWidth = 1 + (edge.weight / maxWeight) * 5;

      ctx.beginPath();
      ctx.moveTo(fromNode.x, fromNode.y);
      ctx.lineTo(toNode.x, toNode.y);
      ctx.strokeStyle = edge.weight > maxWeight * 0.7 ? "#F44336" : "#666";
      ctx.lineWidth = lineWidth;
      ctx.stroke();

      
      drawArrow(ctx, fromNode.x, fromNode.y, toNode.x, toNode.y);
    }
  });

  
  nodes.value.forEach((node) => {
    const color = getNodeColor(node.type);
    const radius = 20;

    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();

    
    ctx.fillStyle = "#000";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(node.alias, node.x, node.y + radius + 15);
  });

  ctx.restore();
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
) {
  const headLength = 10;
  const angle = Math.atan2(toY - fromY, toX - fromX);

  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - headLength * Math.cos(angle - Math.PI / 6),
    toY - headLength * Math.sin(angle - Math.PI / 6)
  );
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - headLength * Math.cos(angle + Math.PI / 6),
    toY - headLength * Math.sin(angle + Math.PI / 6)
  );
  ctx.stroke();
}

function getNodeColor(type: string): string {
  switch (type) {
    case "source":
      return "#4CAF50";
    case "destination":
      return "#FF9800";
    default:
      return "#2196F3";
  }
}

function handleMouseDown(event: MouseEvent) {
  isDragging = true;
  lastMouseX = event.clientX;
  lastMouseY = event.clientY;

  
  const rect = flowCanvas.value?.getBoundingClientRect();
  if (rect) {
    const x = (event.clientX - rect.left - offsetX) / scale;
    const y = (event.clientY - rect.top - offsetY) / scale;

    const clickedNode = nodes.value.find((node) => {
      const dx = x - node.x;
      const dy = y - node.y;
      return Math.sqrt(dx * dx + dy * dy) < 20;
    });

    if (clickedNode) {
      selectedNode.value = clickedNode;
    }
  }
}

function handleMouseMove(event: MouseEvent) {
  if (isDragging) {
    const dx = event.clientX - lastMouseX;
    const dy = event.clientY - lastMouseY;

    offsetX += dx;
    offsetY += dy;

    lastMouseX = event.clientX;
    lastMouseY = event.clientY;

    renderFlow();
  }
}

function handleMouseUp() {
  isDragging = false;
}

function handleWheel(event: WheelEvent) {
  event.preventDefault();

  const delta = event.deltaY > 0 ? 0.9 : 1.1;
  scale *= delta;
  scale = Math.max(0.1, Math.min(5, scale));

  renderFlow();
}

function applyFilters() {
  loadFlowData();
}

function toggleFullscreen() {
  if (!canvasContainer.value) return;

  if (!document.fullscreenElement) {
    canvasContainer.value.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
}

function formatAmount(value: string): string {
  return formatTBAmount(value);
}

function getBalanceColor(balance: string): string {
  return isPositiveTBAmount(balance) ? "success" : "error";
}
</script>

<style scoped>
.flow-canvas-container {
  position: relative;
  width: 100%;
  height: 600px;
  background: #f5f5f5;
  border-radius: 4px;
  overflow: hidden;
}

canvas {
  cursor: grab;
  width: 100%;
  height: 100%;
}

canvas:active {
  cursor: grabbing;
}

.legend-box {
  width: 20px;
  height: 20px;
  border-radius: 50%;
}

.legend-line {
  width: 30px;
  height: 0;
  border-top: 2px solid;
}

.legend-line.thick {
  border-top-width: 4px;
}
</style>
