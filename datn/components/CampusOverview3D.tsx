"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export interface CampusBuildingInfo {
  id: string;
  name: string;
  code: string;
  floors: number;
  apartmentsPerFloor: number;
}

interface BuildingMeshData {
  mesh: THREE.Mesh;
  building: CampusBuildingInfo;
  mat: THREE.MeshStandardMaterial;
  baseEmissiveIntensity: number;
  labelEl: HTMLDivElement | null;
  labelPos: THREE.Vector3;
}

interface CampusOverview3DProps {
  buildings: CampusBuildingInfo[];
  onSelect: (building: CampusBuildingInfo) => void;
}

export default function CampusOverview3D({ buildings, onSelect }: CampusOverview3DProps) {
  const canvasRef      = useRef<HTMLCanvasElement>(null);
  const containerRef   = useRef<HTMLDivElement>(null);
  const labelsHostRef  = useRef<HTMLDivElement>(null);
  const animationIdRef = useRef<number | undefined>(undefined);
  const meshesRef      = useRef<BuildingMeshData[]>([]);
  const hoveredRef     = useRef<BuildingMeshData | null>(null);
  const raycaster      = useRef(new THREE.Raycaster());
  const mouse          = useRef(new THREE.Vector2());
  const onSelectRef    = useRef(onSelect);

  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const labelsHost = labelsHostRef.current;
    if (!canvas || !container || !labelsHost || buildings.length === 0) return;

    meshesRef.current = [];
    hoveredRef.current = null;
    labelsHost.innerHTML = "";

    // ── Scene ───────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1e);
    scene.fog = new THREE.Fog(0x0a0a1e, 15, 140);

    const unitFloorHeight = 0.5;
    const footprintOf = (b: CampusBuildingInfo) => Math.max(3, Math.sqrt(Math.max(b.apartmentsPerFloor, 1)) * 1.6);
    const heightOf    = (b: CampusBuildingInfo) => Math.max(2, b.floors * unitFloorHeight);

    const cols = Math.ceil(Math.sqrt(buildings.length));
    const maxFootprint = Math.max(...buildings.map(footprintOf));
    const gap = maxFootprint * 2.2;
    const maxHeight = Math.max(...buildings.map(heightOf));

    const w = container.clientWidth  || 800;
    const h = container.clientHeight || 600;

    const camDist = Math.max(cols * gap, maxHeight) * 1.3 + 10;
    const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 1000);
    camera.position.set(camDist * 0.8, maxHeight * 1.4 + 8, camDist * 0.8);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, canvas });
    renderer.setSize(w, h, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance   = 6;
    controls.maxDistance   = camDist * 3;
    controls.minPolarAngle = 0;
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.target.set(0, maxHeight * 0.3, 0);
    controls.update();

    // ── Lights ──────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
    dirLight.position.set(30, 40, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    const shadowSpan = Math.max(cols * gap, 30);
    dirLight.shadow.camera.left   = -shadowSpan;
    dirLight.shadow.camera.right  =  shadowSpan;
    dirLight.shadow.camera.top    =  shadowSpan;
    dirLight.shadow.camera.bottom = -shadowSpan;
    scene.add(dirLight);
    const pt1 = new THREE.PointLight(0x4f46e5, 0.7);
    pt1.position.set(-20, 20, -20);
    scene.add(pt1);
    const pt2 = new THREE.PointLight(0x7c3aed, 0.7);
    pt2.position.set(20, 20, 20);
    scene.add(pt2);

    // ── Ground + grid ───────────────────────────────────────────────────
    const groundSize = Math.max(cols * gap * 1.6, 60);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(groundSize, groundSize),
      new THREE.MeshStandardMaterial({ color: 0x0f0f1e, metalness: 0.5, roughness: 0.8 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.5;
    ground.receiveShadow = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(groundSize, Math.round(groundSize / 2), 0x4f46e5, 0x1a1a2e);
    grid.position.y = -0.49;
    scene.add(grid);

    // ── Buildings (simple blocks laid out on a grid) ──────────────────
    const group = new THREE.Group();

    buildings.forEach((b, i) => {
      const footprint = footprintOf(b);
      const height    = heightOf(b);
      const col = i % cols;
      const row = Math.floor(i / cols);
      const totalCols = cols;
      const totalRows = Math.ceil(buildings.length / cols);
      const x = (col - (totalCols - 1) / 2) * gap;
      const z = (row - (totalRows - 1) / 2) * gap;

      const baseColor    = new THREE.Color(0x4f46e5);
      const baseEmissive = new THREE.Color(0x312e81);
      const mat = new THREE.MeshStandardMaterial({
        color: baseColor, metalness: 0.5, roughness: 0.35,
        emissive: baseEmissive, emissiveIntensity: 0.18,
      });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(footprint, height, footprint), mat);
      mesh.position.set(x, height / 2, z);
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.userData = { buildingId: b.id };
      group.add(mesh);

      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(mesh.geometry),
        new THREE.LineBasicMaterial({ color: 0x818cf8, transparent: true, opacity: 0.5 })
      );
      mesh.add(edges);

      // Simple window bands per floor on all 4 faces
      const winMat = new THREE.MeshStandardMaterial({
        color: 0x88ccff, metalness: 0.9, roughness: 0.1,
        emissive: 0x4488ff, emissiveIntensity: 0.35,
      });
      const floorsToShow = Math.min(b.floors, 30);
      for (let f = 0; f < floorsToShow; f++) {
        const fy = -height / 2 + (f + 0.5) * (height / floorsToShow);
        const band = new THREE.Mesh(new THREE.BoxGeometry(footprint * 0.9, height / floorsToShow * 0.35, 0.03), winMat);
        band.position.set(0, fy, footprint / 2 + 0.02);
        mesh.add(band);
        const band2 = band.clone();
        band2.rotation.y = Math.PI / 2;
        band2.position.set(footprint / 2 + 0.02, fy, 0);
        mesh.add(band2);
      }

      const labelPos = new THREE.Vector3(x, height + 1.2, z);
      const labelEl = document.createElement("div");
      labelEl.className = "pointer-events-none absolute -translate-x-1/2 -translate-y-full px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-sm text-white text-xs font-semibold border border-indigo-400/30 whitespace-nowrap shadow-lg";
      labelEl.textContent = `${b.name} · ${b.floors} tầng`;
      labelsHost.appendChild(labelEl);

      meshesRef.current.push({
        mesh, building: b, mat,
        baseEmissiveIntensity: 0.18,
        labelEl, labelPos,
      });
    });

    scene.add(group);

    // ── Interaction ─────────────────────────────────────────────────────
    const allMeshes = meshesRef.current.map((m) => m.mesh);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.current.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
      mouse.current.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;

      raycaster.current.setFromCamera(mouse.current, camera);
      const hits = raycaster.current.intersectObjects(allMeshes);

      if (hits.length > 0) {
        const hitMesh = hits[0].object as THREE.Mesh;
        const found = meshesRef.current.find((m) => m.mesh === hitMesh) ?? null;
        if (found !== hoveredRef.current) {
          if (hoveredRef.current) hoveredRef.current.mat.emissiveIntensity = hoveredRef.current.baseEmissiveIntensity;
          hoveredRef.current = found;
          if (found) found.mat.emissiveIntensity = 0.6;
        }
        if (found) setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, text: `${found.building.name} — Bấm để mở` });
        canvas.style.cursor = "pointer";
      } else {
        if (hoveredRef.current) hoveredRef.current.mat.emissiveIntensity = hoveredRef.current.baseEmissiveIntensity;
        hoveredRef.current = null;
        setTooltip(null);
        canvas.style.cursor = "grab";
      }
    };

    const handleClick = () => {
      if (hoveredRef.current) onSelectRef.current(hoveredRef.current.building);
    };

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("click", handleClick);

    // ── Animate ─────────────────────────────────────────────────────────
    const tmpVec = new THREE.Vector3();
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      controls.update();

      // Project label positions to screen space each frame
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      meshesRef.current.forEach((m) => {
        if (!m.labelEl) return;
        tmpVec.copy(m.labelPos).project(camera);
        const behindCamera = tmpVec.z > 1;
        if (behindCamera) {
          m.labelEl.style.display = "none";
          return;
        }
        m.labelEl.style.display = "block";
        const x = (tmpVec.x * 0.5 + 0.5) * cw;
        const y = (-tmpVec.y * 0.5 + 0.5) * ch;
        m.labelEl.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
      });

      renderer.render(scene, camera);
    };
    animate();

    // ── Resize ──────────────────────────────────────────────────────────
    const handleResize = () => {
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      if (!cw || !ch) return;
      camera.aspect = cw / ch;
      camera.updateProjectionMatrix();
      renderer.setSize(cw, ch, false);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    window.addEventListener("resize", handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("click", handleClick);
      if (animationIdRef.current !== undefined) cancelAnimationFrame(animationIdRef.current);
      controls.dispose();
      renderer.dispose();
      labelsHost.innerHTML = "";
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (obj.material instanceof THREE.Material) obj.material.dispose();
        }
        if (obj instanceof THREE.LineSegments) {
          obj.geometry.dispose();
          if (obj.material instanceof THREE.Material) obj.material.dispose();
        }
      });
    };
  }, [buildings]);

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-150">
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%", height: "100%", touchAction: "none", cursor: "grab" }}
      />
      <div ref={labelsHostRef} className="absolute inset-0 overflow-hidden pointer-events-none" />
      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-sm text-white text-xs font-mono border border-white/20 shadow-lg whitespace-nowrap"
          style={{ left: tooltip.x + 14, top: tooltip.y - 10 }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
