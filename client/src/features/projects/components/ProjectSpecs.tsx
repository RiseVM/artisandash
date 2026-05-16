import { useEffect, useMemo, useState } from "react";
import {
  useProjectSpecs,
  useUpdateProjectSpecs,
  useUpdateProjectTile,
} from "../hooks";
import { useAuth } from "@/features/auth/hooks";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, ClipboardList, Check } from "lucide-react";
import type { ProjectSpecs, ProjectTile } from "@shared/schema";

type SpecsForm = Omit<
  ProjectSpecs,
  "id" | "project_id" | "created_at" | "updated_at"
>;

type TileForm = {
  pattern: string;
  grout_color: string;
  notes: string;
};

const EMPTY_SPECS: SpecsForm = {
  contractor_on_job: "",
  shower_bench_seat: "",
  shower_niche: "",
  shower_shelf: "",
  accent_wall: "",
  paint_wall_brand: "",
  paint_wall_color: "",
  paint_wall_finish: "",
  paint_trim_brand: "",
  paint_trim_color: "",
  paint_trim_finish: "",
  plumber_on_job: "",
  plumbing_selection: "",
  plumbing_description: "",
  vent_brand: "",
  vent_cfm: "",
  electrician_on_job: "",
  electrical_description: "",
  electrical_fixtures: "",
  vanity_brand: "",
  vanity_color: "",
  vanity_finish: "",
  hardware: "",
  shower_door_company: "",
  shower_door_description: "",
};

const EMPTY_TILE: TileForm = { pattern: "", grout_color: "", notes: "" };

const TILE_LABELS: Record<string, string> = {
  shower_wall: "Shower wall tile",
  shower_floor: "Shower floor tile",
  bathroom_floor: "Bathroom floor tile",
};

function normalize(s: ProjectSpecs | null | undefined): SpecsForm {
  if (!s) return { ...EMPTY_SPECS };
  const out = { ...EMPTY_SPECS };
  (Object.keys(EMPTY_SPECS) as (keyof SpecsForm)[]).forEach((k) => {
    out[k] = ((s as any)[k] ?? "") as string;
  });
  return out;
}

function tilesByLocation(tiles: ProjectTile[]): Record<string, TileForm> {
  const map: Record<string, TileForm> = {
    shower_wall: { ...EMPTY_TILE },
    shower_floor: { ...EMPTY_TILE },
    bathroom_floor: { ...EMPTY_TILE },
  };
  for (const t of tiles) {
    map[t.location] = {
      pattern: t.pattern ?? "",
      grout_color: t.grout_color ?? "",
      notes: t.notes ?? "",
    };
  }
  return map;
}

interface Props {
  projectId: number;
}

export function ProjectSpecs({ projectId }: Props) {
  const { data, isLoading } = useProjectSpecs(projectId);
  const updateSpecs = useUpdateProjectSpecs();
  const updateTile = useUpdateProjectTile();
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const canEdit = hasPermission("manage_projects");

  const [form, setForm] = useState<SpecsForm>(EMPTY_SPECS);
  const [tiles, setTiles] = useState<Record<string, TileForm>>(
    tilesByLocation([])
  );
  const [savingSection, setSavingSection] = useState<string | null>(null);

  // Seed local state when the server payload arrives / changes
  useEffect(() => {
    if (!data) return;
    setForm(normalize(data.specs));
    setTiles(tilesByLocation(data.tiles ?? []));
  }, [data]);

  const setField = (k: keyof SpecsForm, v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const setTileField = (
    loc: "shower_wall" | "shower_floor" | "bathroom_floor",
    k: keyof TileForm,
    v: string
  ) =>
    setTiles((prev) => ({
      ...prev,
      [loc]: { ...prev[loc], [k]: v },
    }));

  const saveSpecsFields = async (
    sectionKey: string,
    fields: (keyof SpecsForm)[]
  ) => {
    if (!canEdit) return;
    setSavingSection(sectionKey);
    try {
      const payload: Partial<SpecsForm> = {};
      fields.forEach((f) => {
        payload[f] = (form[f] ?? "") as any;
      });
      await updateSpecs.mutateAsync({ projectId, data: payload as any });
      toast({ title: "Saved" });
    } catch (err: any) {
      toast({
        title: "Save failed",
        description: err?.message || "Could not save section.",
        variant: "destructive",
      });
    } finally {
      setSavingSection(null);
    }
  };

  const saveTile = async (
    loc: "shower_wall" | "shower_floor" | "bathroom_floor"
  ) => {
    if (!canEdit) return;
    setSavingSection(`tile_${loc}`);
    try {
      await updateTile.mutateAsync({
        projectId,
        location: loc,
        data: tiles[loc] as any,
      });
      toast({ title: "Tile saved" });
    } catch (err: any) {
      toast({
        title: "Save failed",
        description: err?.message || "Could not save tile.",
        variant: "destructive",
      });
    } finally {
      setSavingSection(null);
    }
  };

  // Section completion summary — count any filled field per section
  const summary = useMemo(() => {
    const filled = (vals: string[]) =>
      vals.some((v) => (v ?? "").trim().length > 0);
    return {
      contractor: !!form.contractor_on_job?.trim(),
      shower: filled([
        tiles.shower_wall.pattern,
        tiles.shower_wall.grout_color,
        tiles.shower_floor.pattern,
        tiles.shower_floor.grout_color,
        form.shower_bench_seat,
        form.shower_niche,
        form.shower_shelf,
      ]),
      bathroomFloor: filled([
        tiles.bathroom_floor.pattern,
        tiles.bathroom_floor.grout_color,
      ]),
      accent: !!form.accent_wall?.trim(),
      paint: filled([
        form.paint_wall_brand,
        form.paint_wall_color,
        form.paint_wall_finish,
        form.paint_trim_brand,
        form.paint_trim_color,
        form.paint_trim_finish,
      ]),
      plumbing: filled([
        form.plumber_on_job,
        form.plumbing_selection,
        form.plumbing_description,
        form.vent_brand,
        form.vent_cfm,
      ]),
      electrical: filled([
        form.electrician_on_job,
        form.electrical_description,
        form.electrical_fixtures,
      ]),
      vanity: filled([
        form.vanity_brand,
        form.vanity_color,
        form.vanity_finish,
      ]),
      hardware: !!form.hardware?.trim(),
      showerDoor: filled([
        form.shower_door_company,
        form.shower_door_description,
      ]),
    };
  }, [form, tiles]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const SectionFlag = ({ done }: { done: boolean }) =>
    done ? (
      <span className="inline-flex items-center gap-1 text-xs text-green-600">
        <Check className="h-3.5 w-3.5" />
        Filled
      </span>
    ) : (
      <span className="text-xs text-muted-foreground">Empty</span>
    );

  const SaveBtn = ({
    sectionKey,
    onClick,
  }: {
    sectionKey: string;
    onClick: () => void;
  }) =>
    canEdit ? (
      <div className="flex justify-end pt-2">
        <Button
          size="sm"
          onClick={onClick}
          disabled={savingSection === sectionKey}
        >
          {savingSection === sectionKey ? (
            <>
              <Loader2 className="h-3 w-3 mr-2 animate-spin" />
              Saving…
            </>
          ) : (
            "Save section"
          )}
        </Button>
      </div>
    ) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          Bathroom Specifications
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Trade-by-trade selections, finishes, and on-site contacts. Mirrors
          Claudia&rsquo;s on-site spec sheet.
        </p>
      </CardHeader>
      <CardContent>
        {/* Contractor (always visible at the top, not in accordion) */}
        <div className="mb-6 border rounded-md p-4 bg-muted/30">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-sm font-semibold">
              Contractor on job
            </Label>
            <SectionFlag done={summary.contractor} />
          </div>
          <Input
            disabled={!canEdit}
            value={form.contractor_on_job ?? ""}
            placeholder="General contractor name / company"
            onChange={(e) => setField("contractor_on_job", e.target.value)}
          />
          <SaveBtn
            sectionKey="contractor"
            onClick={() => saveSpecsFields("contractor", ["contractor_on_job"])}
          />
        </div>

        <Accordion type="multiple" className="w-full">
          {/* SHOWER */}
          <AccordionItem value="shower">
            <AccordionTrigger>
              <div className="flex items-center gap-3">
                <span className="font-medium">Shower</span>
                <SectionFlag done={summary.shower} />
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-6 pt-2">
                {(["shower_wall", "shower_floor"] as const).map((loc) => (
                  <div key={loc} className="border rounded-md p-4">
                    <div className="font-medium mb-3">{TILE_LABELS[loc]}</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Pattern</Label>
                        <Input
                          disabled={!canEdit}
                          value={tiles[loc].pattern}
                          onChange={(e) =>
                            setTileField(loc, "pattern", e.target.value)
                          }
                          placeholder="e.g. 3x6 subway, herringbone"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Grout color</Label>
                        <Input
                          disabled={!canEdit}
                          value={tiles[loc].grout_color}
                          onChange={(e) =>
                            setTileField(loc, "grout_color", e.target.value)
                          }
                          placeholder="e.g. Mapei Pearl Gray"
                        />
                      </div>
                    </div>
                    <div className="mt-3">
                      <Label className="text-xs">Notes</Label>
                      <Textarea
                        disabled={!canEdit}
                        rows={2}
                        value={tiles[loc].notes}
                        onChange={(e) =>
                          setTileField(loc, "notes", e.target.value)
                        }
                        placeholder="Layout direction, sample photo location, etc."
                      />
                    </div>
                    {canEdit && (
                      <div className="flex justify-end pt-2">
                        <Button
                          size="sm"
                          onClick={() => saveTile(loc)}
                          disabled={savingSection === `tile_${loc}`}
                        >
                          {savingSection === `tile_${loc}` ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                              Saving…
                            </>
                          ) : (
                            "Save tile"
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                ))}

                <div className="border rounded-md p-4">
                  <div className="font-medium mb-3">
                    Bench seat / Niche / Shelf
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Bench seat</Label>
                      <Input
                        disabled={!canEdit}
                        value={form.shower_bench_seat ?? ""}
                        onChange={(e) =>
                          setField("shower_bench_seat", e.target.value)
                        }
                        placeholder="Size / material / finish"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Niche</Label>
                      <Input
                        disabled={!canEdit}
                        value={form.shower_niche ?? ""}
                        onChange={(e) =>
                          setField("shower_niche", e.target.value)
                        }
                        placeholder='e.g. 12x24 with shelf @ 48"'
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Shelf</Label>
                      <Input
                        disabled={!canEdit}
                        value={form.shower_shelf ?? ""}
                        onChange={(e) =>
                          setField("shower_shelf", e.target.value)
                        }
                        placeholder="Corner shelf, material, etc."
                      />
                    </div>
                  </div>
                  <SaveBtn
                    sectionKey="shower_extras"
                    onClick={() =>
                      saveSpecsFields("shower_extras", [
                        "shower_bench_seat",
                        "shower_niche",
                        "shower_shelf",
                      ])
                    }
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* BATHROOM FLOOR */}
          <AccordionItem value="bathroom_floor">
            <AccordionTrigger>
              <div className="flex items-center gap-3">
                <span className="font-medium">Bathroom floor</span>
                <SectionFlag done={summary.bathroomFloor} />
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="border rounded-md p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Pattern</Label>
                    <Input
                      disabled={!canEdit}
                      value={tiles.bathroom_floor.pattern}
                      onChange={(e) =>
                        setTileField(
                          "bathroom_floor",
                          "pattern",
                          e.target.value
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Grout color</Label>
                    <Input
                      disabled={!canEdit}
                      value={tiles.bathroom_floor.grout_color}
                      onChange={(e) =>
                        setTileField(
                          "bathroom_floor",
                          "grout_color",
                          e.target.value
                        )
                      }
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <Label className="text-xs">Notes</Label>
                  <Textarea
                    disabled={!canEdit}
                    rows={2}
                    value={tiles.bathroom_floor.notes}
                    onChange={(e) =>
                      setTileField(
                        "bathroom_floor",
                        "notes",
                        e.target.value
                      )
                    }
                  />
                </div>
                {canEdit && (
                  <div className="flex justify-end pt-2">
                    <Button
                      size="sm"
                      onClick={() => saveTile("bathroom_floor")}
                      disabled={savingSection === "tile_bathroom_floor"}
                    >
                      {savingSection === "tile_bathroom_floor" ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                          Saving…
                        </>
                      ) : (
                        "Save tile"
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* ACCENT WALL */}
          <AccordionItem value="accent_wall">
            <AccordionTrigger>
              <div className="flex items-center gap-3">
                <span className="font-medium">Accent wall</span>
                <SectionFlag done={summary.accent} />
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                <Label className="text-xs">Description</Label>
                <Textarea
                  disabled={!canEdit}
                  rows={3}
                  value={form.accent_wall ?? ""}
                  onChange={(e) => setField("accent_wall", e.target.value)}
                  placeholder="Which wall, material, treatment, etc."
                />
                <SaveBtn
                  sectionKey="accent_wall"
                  onClick={() =>
                    saveSpecsFields("accent_wall", ["accent_wall"])
                  }
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* PAINT */}
          <AccordionItem value="paint">
            <AccordionTrigger>
              <div className="flex items-center gap-3">
                <span className="font-medium">Paint</span>
                <SectionFlag done={summary.paint} />
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                <div className="border rounded-md p-4">
                  <div className="font-medium mb-3">Wall</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Brand</Label>
                      <Input
                        disabled={!canEdit}
                        value={form.paint_wall_brand ?? ""}
                        onChange={(e) =>
                          setField("paint_wall_brand", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Color</Label>
                      <Input
                        disabled={!canEdit}
                        value={form.paint_wall_color ?? ""}
                        onChange={(e) =>
                          setField("paint_wall_color", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Finish</Label>
                      <Input
                        disabled={!canEdit}
                        value={form.paint_wall_finish ?? ""}
                        onChange={(e) =>
                          setField("paint_wall_finish", e.target.value)
                        }
                        placeholder="Matte, eggshell, satin…"
                      />
                    </div>
                  </div>
                </div>

                <div className="border rounded-md p-4">
                  <div className="font-medium mb-3">Trim</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Brand</Label>
                      <Input
                        disabled={!canEdit}
                        value={form.paint_trim_brand ?? ""}
                        onChange={(e) =>
                          setField("paint_trim_brand", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Color</Label>
                      <Input
                        disabled={!canEdit}
                        value={form.paint_trim_color ?? ""}
                        onChange={(e) =>
                          setField("paint_trim_color", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Finish</Label>
                      <Input
                        disabled={!canEdit}
                        value={form.paint_trim_finish ?? ""}
                        onChange={(e) =>
                          setField("paint_trim_finish", e.target.value)
                        }
                        placeholder="Semi-gloss, gloss…"
                      />
                    </div>
                  </div>
                </div>

                <SaveBtn
                  sectionKey="paint"
                  onClick={() =>
                    saveSpecsFields("paint", [
                      "paint_wall_brand",
                      "paint_wall_color",
                      "paint_wall_finish",
                      "paint_trim_brand",
                      "paint_trim_color",
                      "paint_trim_finish",
                    ])
                  }
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* PLUMBING */}
          <AccordionItem value="plumbing">
            <AccordionTrigger>
              <div className="flex items-center gap-3">
                <span className="font-medium">Plumbing</span>
                <SectionFlag done={summary.plumbing} />
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs">Plumber on job</Label>
                  <Input
                    disabled={!canEdit}
                    value={form.plumber_on_job ?? ""}
                    onChange={(e) =>
                      setField("plumber_on_job", e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Selections</Label>
                  <Textarea
                    disabled={!canEdit}
                    rows={2}
                    value={form.plumbing_selection ?? ""}
                    onChange={(e) =>
                      setField("plumbing_selection", e.target.value)
                    }
                    placeholder="Shower valve, tub filler, faucet, drains, etc."
                  />
                </div>
                <div>
                  <Label className="text-xs">Description of job</Label>
                  <Textarea
                    disabled={!canEdit}
                    rows={3}
                    value={form.plumbing_description ?? ""}
                    onChange={(e) =>
                      setField("plumbing_description", e.target.value)
                    }
                    placeholder="Rough-in scope, supply line changes, drain re-routes, etc."
                  />
                </div>

                <div className="border rounded-md p-4">
                  <div className="font-medium mb-3">Vent</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Brand</Label>
                      <Input
                        disabled={!canEdit}
                        value={form.vent_brand ?? ""}
                        onChange={(e) =>
                          setField("vent_brand", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">CFM</Label>
                      <Input
                        disabled={!canEdit}
                        value={form.vent_cfm ?? ""}
                        onChange={(e) => setField("vent_cfm", e.target.value)}
                        placeholder="e.g. 110"
                      />
                    </div>
                  </div>
                </div>

                <SaveBtn
                  sectionKey="plumbing"
                  onClick={() =>
                    saveSpecsFields("plumbing", [
                      "plumber_on_job",
                      "plumbing_selection",
                      "plumbing_description",
                      "vent_brand",
                      "vent_cfm",
                    ])
                  }
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* ELECTRICAL */}
          <AccordionItem value="electrical">
            <AccordionTrigger>
              <div className="flex items-center gap-3">
                <span className="font-medium">Electrical</span>
                <SectionFlag done={summary.electrical} />
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs">Electrician on job</Label>
                  <Input
                    disabled={!canEdit}
                    value={form.electrician_on_job ?? ""}
                    onChange={(e) =>
                      setField("electrician_on_job", e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Description of job</Label>
                  <Textarea
                    disabled={!canEdit}
                    rows={3}
                    value={form.electrical_description ?? ""}
                    onChange={(e) =>
                      setField("electrical_description", e.target.value)
                    }
                    placeholder="Rough-in scope, circuit changes, switch locations, etc."
                  />
                </div>
                <div>
                  <Label className="text-xs">Fixtures</Label>
                  <Textarea
                    disabled={!canEdit}
                    rows={3}
                    value={form.electrical_fixtures ?? ""}
                    onChange={(e) =>
                      setField("electrical_fixtures", e.target.value)
                    }
                    placeholder="Vanity light, sconces, recessed cans, exhaust fan, etc."
                  />
                </div>
                <SaveBtn
                  sectionKey="electrical"
                  onClick={() =>
                    saveSpecsFields("electrical", [
                      "electrician_on_job",
                      "electrical_description",
                      "electrical_fixtures",
                    ])
                  }
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* VANITY */}
          <AccordionItem value="vanity">
            <AccordionTrigger>
              <div className="flex items-center gap-3">
                <span className="font-medium">Vanity &amp; top</span>
                <SectionFlag done={summary.vanity} />
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Brand</Label>
                  <Input
                    disabled={!canEdit}
                    value={form.vanity_brand ?? ""}
                    onChange={(e) => setField("vanity_brand", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Color</Label>
                  <Input
                    disabled={!canEdit}
                    value={form.vanity_color ?? ""}
                    onChange={(e) => setField("vanity_color", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Finish</Label>
                  <Input
                    disabled={!canEdit}
                    value={form.vanity_finish ?? ""}
                    onChange={(e) =>
                      setField("vanity_finish", e.target.value)
                    }
                  />
                </div>
              </div>
              <SaveBtn
                sectionKey="vanity"
                onClick={() =>
                  saveSpecsFields("vanity", [
                    "vanity_brand",
                    "vanity_color",
                    "vanity_finish",
                  ])
                }
              />
            </AccordionContent>
          </AccordionItem>

          {/* HARDWARE */}
          <AccordionItem value="hardware">
            <AccordionTrigger>
              <div className="flex items-center gap-3">
                <span className="font-medium">Hardware</span>
                <SectionFlag done={summary.hardware} />
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                <Label className="text-xs">Description</Label>
                <Textarea
                  disabled={!canEdit}
                  rows={3}
                  value={form.hardware ?? ""}
                  onChange={(e) => setField("hardware", e.target.value)}
                  placeholder="Robe hooks, towel bars, TP holder, finish, etc."
                />
                <SaveBtn
                  sectionKey="hardware"
                  onClick={() =>
                    saveSpecsFields("hardware", ["hardware"])
                  }
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* SHOWER DOOR */}
          <AccordionItem value="shower_door">
            <AccordionTrigger>
              <div className="flex items-center gap-3">
                <span className="font-medium">Shower door</span>
                <SectionFlag done={summary.showerDoor} />
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs">Company on job</Label>
                  <Input
                    disabled={!canEdit}
                    value={form.shower_door_company ?? ""}
                    onChange={(e) =>
                      setField("shower_door_company", e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Description</Label>
                  <Textarea
                    disabled={!canEdit}
                    rows={3}
                    value={form.shower_door_description ?? ""}
                    onChange={(e) =>
                      setField("shower_door_description", e.target.value)
                    }
                    placeholder="Style (frameless, semi-frameless), glass thickness, hardware finish, dimensions"
                  />
                </div>
                <SaveBtn
                  sectionKey="shower_door"
                  onClick={() =>
                    saveSpecsFields("shower_door", [
                      "shower_door_company",
                      "shower_door_description",
                    ])
                  }
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
