"use client";

import { useMemo } from "react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import FilterSelect from "@/components/ui/FilterSelect";
import MetalCard from "@/components/ui/MetalCard";
import { useRoles } from "@/hooks/rbac/useRoles";

export default function AdminTeamFilter() {
    const t = useTranslations();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const router = useRouter();

    const { data: rolesData } = useRoles();
    const adminRoles = useMemo(() => {
        const roles = rolesData?.data ?? [];
        return roles
            .filter((r) => r.portalType === "ADMIN")
            .map((r) => ({
                value: r.name,
                label: r.name,
            }));
    }, [rolesData?.data]);

    const statusOptions = useMemo(
        () => [
            { value: "true", label: t("admin.adminTeam.active") },
            { value: "false", label: t("admin.adminTeam.inactive") },
        ],
        [t],
    );

    function updateParam(key: string, value: string) {
        const params = new URLSearchParams(searchParams.toString());
        if (!value) {
            params.delete(key);
        } else {
            params.set(key, value);
        }
        params.set("page", "1");
        router.push(`${pathname}?${params.toString()}`);
    }

    return (
        <MetalCard className="px-6 py-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-3">
                    <label className="metal-text metal-glow text-sm font-semibold uppercase tracking-[0.18em]">
                        {t("admin.adminTeam.search")}
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder={t("admin.adminTeam.searchPlaceholder")}
                            defaultValue={searchParams.get("fullName") ?? ""}
                            onChange={(e) =>
                                updateParam("fullName", e.target.value)
                            }
                            className="w-full rounded-2xl border border-border bg-card py-3 px-5 text-sm text-foreground shadow-glass backdrop-blur-xl outline-none transition-all duration-300 hover:border-border-strong focus:border-primary-light focus:shadow-[0_0_28px_rgba(21,174,245,0.18)] placeholder:text-muted"
                        />
                    </div>
                </div>

                <FilterSelect
                    label={t("admin.adminTeam.filterRole")}
                    filterField="roleName"
                    options={adminRoles}
                    placeholder={t("admin.adminTeam.allRoles")}
                />

                <FilterSelect
                    label={t("admin.adminTeam.filterStatus")}
                    filterField="isActive"
                    options={statusOptions}
                    placeholder={t("admin.adminTeam.allStatus")}
                />
            </div>
        </MetalCard>
    );
}
