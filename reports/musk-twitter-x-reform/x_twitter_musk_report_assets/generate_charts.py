import os
import sys
import textwrap

DEPS = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "output", "apple_price_report_deps"))
if os.path.isdir(DEPS):
    sys.path.insert(0, DEPS)

import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
import numpy as np
import pandas as pd
import seaborn as sns

OUT_DIR = os.path.dirname(__file__)

FONT_FAMILY = ["Aptos", "Inter", "Segoe UI", "DejaVu Sans", "Arial", "sans-serif"]
MONO_FONT_FAMILY = ["DejaVu Sans Mono", "monospace"]

TOKENS = {
    "surface": "#F5F6F8",
    "panel": "#FFFFFF",
    "ink": "#17202A",
    "muted": "#69727F",
    "grid": "#E3E7ED",
    "axis": "#D4D9E2",
}

FAMILIES = {
    "black": {"xlight": "#EEF0F3", "light": "#CDD3DC", "base": "#8F98A6", "mid": "#505A67", "dark": "#17202A"},
    "teal": {"xlight": "#DFF5F3", "light": "#A8DED9", "base": "#2CA6A4", "mid": "#1D7978", "dark": "#0E4D4E"},
    "amber": {"xlight": "#FFF1C9", "light": "#F2CC62", "base": "#D79A21", "mid": "#A06D0A", "dark": "#654307"},
    "red": {"xlight": "#FDE3E3", "light": "#F7A8A8", "base": "#D94C4C", "mid": "#A93030", "dark": "#6F1B1B"},
    "green": {"xlight": "#E0F3E8", "light": "#9CD6B2", "base": "#43A66B", "mid": "#2E7B4C", "dark": "#1B4E31"},
    "blue": {"xlight": "#E2ECFF", "light": "#AFC8FF", "base": "#5F8FED", "mid": "#3F67B5", "dark": "#263F73"},
}


def theme() -> None:
    sns.set_theme(
        style="whitegrid",
        rc={
            "figure.facecolor": TOKENS["surface"],
            "figure.edgecolor": "none",
            "savefig.facecolor": "none",
            "savefig.edgecolor": "none",
            "axes.facecolor": TOKENS["panel"],
            "axes.edgecolor": TOKENS["axis"],
            "axes.labelcolor": TOKENS["ink"],
            "axes.grid": True,
            "axes.spines.top": False,
            "axes.spines.right": False,
            "grid.color": TOKENS["grid"],
            "grid.linewidth": 0.8,
            "font.family": "sans-serif",
            "font.sans-serif": FONT_FAMILY,
            "font.monospace": MONO_FONT_FAMILY,
            "patch.linewidth": 1.0,
        },
    )


def add_header(fig, ax, title, subtitle, *, title_width=74, subtitle_width=112) -> None:
    title = textwrap.fill(str(title).strip(), width=title_width, break_long_words=False)
    subtitle = textwrap.fill(str(subtitle).strip(), width=subtitle_width, break_long_words=False)
    if not title or not subtitle:
        raise ValueError("Every chart needs a title and subtitle.")
    title_lines = title.count("\n") + 1
    subtitle_lines = subtitle.count("\n") + 1
    ax.set_title("")
    fig.subplots_adjust(top=max(0.61, 0.86 - 0.045 * (title_lines - 1) - 0.032 * (subtitle_lines - 1)))
    left = ax.get_position().x0
    fig.text(left, 0.985, title, ha="left", va="top", fontsize=14, fontweight="semibold", color=TOKENS["ink"], linespacing=1.08)
    fig.text(left, 0.925 - 0.045 * (title_lines - 1), subtitle, ha="left", va="top", fontsize=9.5, color=TOKENS["muted"], linespacing=1.18)
    sns.despine(ax=ax)


def save(fig, name: str) -> None:
    fig.savefig(os.path.join(OUT_DIR, name), dpi=220, bbox_inches="tight", pad_inches=0.15)
    plt.close(fig)


def chart_ad_revenue():
    df = pd.DataFrame(
        [
            ("2021\nTwitter", 4.505, "pre-takeover baseline", FAMILIES["black"]),
            ("2023\nX", 2.3, "post-takeover reset", FAMILIES["red"]),
            ("2024\nX", 1.7, "trough", FAMILIES["red"]),
            ("2025\nX", 1.8, "early rebound", FAMILIES["amber"]),
        ],
        columns=["year", "revenue", "note", "family"],
    )
    fig, ax = plt.subplots(figsize=(10.8, 5.6))
    colors = [row.family["base"] for row in df.itertuples()]
    edges = [row.family["dark"] for row in df.itertuples()]
    bars = ax.bar(df["year"], df["revenue"], color=colors, edgecolor=edges, linewidth=1.0, width=0.62)
    ax.axhline(4.505, color=FAMILIES["black"]["mid"], linestyle=":", linewidth=1.1)
    for bar, row in zip(bars, df.itertuples()):
        ax.text(
            bar.get_x() + bar.get_width() / 2,
            row.revenue + 0.12,
            f"${row.revenue:.1f}B",
            ha="center",
            va="bottom",
            fontsize=10,
            fontfamily=MONO_FONT_FAMILY,
            color=TOKENS["ink"],
        )
        ax.text(
            bar.get_x() + bar.get_width() / 2,
            0.10,
            row.note,
            ha="center",
            va="bottom",
            fontsize=8.5,
            color=TOKENS["muted"],
        )
    ax.text(2.72, 4.62, "2021 ad baseline", ha="right", va="bottom", fontsize=8.5, color=TOKENS["muted"])
    ax.set_ylim(0, 5.2)
    ax.set_ylabel("Advertising revenue")
    ax.yaxis.set_major_formatter(mticker.StrMethodFormatter("${x:,.1f}B"))
    ax.grid(axis="x", visible=False)
    add_header(
        fig,
        ax,
        "Advertising revenue reset first, then stabilized",
        "Reported X ad revenue fell far below Twitter's 2021 baseline; 2025 shows early recovery but still about 60% lower than 2021.",
    )
    save(fig, "ad_revenue_rebuild.png")


def chart_valuation():
    rows = [
        ("Oct 2022\nbuyout", 44.0, "Purchase value", FAMILIES["black"]),
        ("Nov 2023\nFidelity mark", 12.5, "-71.5% mark", FAMILIES["red"]),
        ("Sep 2024\nreported mark", 10.0, "near trough", FAMILIES["red"]),
        ("Mar 2025\nsecondary", 44.0, "reported rebound", FAMILIES["green"]),
        ("Mar 2025\nxAI/X EV", 45.0, "enterprise value", FAMILIES["teal"]),
    ]
    df = pd.DataFrame(rows, columns=["marker", "value", "label", "family"])
    x = np.arange(len(df))
    fig, ax = plt.subplots(figsize=(10.8, 5.6))
    ax.plot(x, df["value"], color=FAMILIES["black"]["mid"], linewidth=1.4, linestyle="--", zorder=1)
    for i, row in df.iterrows():
        family = row["family"]
        ax.scatter(i, row["value"], s=170, color=family["base"], edgecolor=family["dark"], linewidth=1.4, zorder=3)
        ax.text(i, row["value"] + 2.2, f"${row['value']:.0f}B", ha="center", va="bottom", fontsize=9.5, fontfamily=MONO_FONT_FAMILY, color=TOKENS["ink"])
        ax.text(i, row["value"] - 3.4, row["label"], ha="center", va="top", fontsize=8.3, color=TOKENS["muted"])
    ax.set_xticks(x, df["marker"])
    ax.set_ylim(0, 52)
    ax.set_ylabel("Publicly reported valuation marker")
    ax.yaxis.set_major_formatter(mticker.StrMethodFormatter("${x:,.0f}B"))
    ax.grid(axis="x", visible=False)
    add_header(
        fig,
        ax,
        "Valuation signals whipsawed before the AI narrative repaired confidence",
        "Markers are not strictly comparable: acquisition price, fund marks, secondary reports, and xAI/X enterprise value each use different bases.",
    )
    save(fig, "valuation_journey.png")


def chart_reform_matrix():
    data = [
        ("Workforce & cost cuts", 5, 1, -3),
        ("Paid verification", 1, 2, -2),
        ("Moderation/free speech reset", 1, -3, -4),
        ("X rebrand/everything app", 0, 1, -2),
        ("Advertiser/legal hard line", 0, 1, -3),
        ("xAI/Grok integration", 2, 4, 1),
    ]
    df = pd.DataFrame(data, columns=["reform", "cost_efficiency", "revenue_option", "trust_brand"])
    matrix = df.set_index("reform")[["cost_efficiency", "revenue_option", "trust_brand"]]
    fig, ax = plt.subplots(figsize=(9.8, 5.8))
    cmap = sns.diverging_palette(12, 165, s=70, l=48, as_cmap=True)
    sns.heatmap(
        matrix,
        ax=ax,
        cmap=cmap,
        center=0,
        vmin=-5,
        vmax=5,
        linewidths=1.0,
        linecolor=TOKENS["panel"],
        annot=True,
        fmt=".0f",
        cbar=False,
        annot_kws={"fontsize": 10, "fontweight": "semibold", "color": TOKENS["ink"]},
    )
    ax.set_xlabel("")
    ax.set_ylabel("")
    ax.set_xticklabels(["Cost efficiency", "Revenue option", "Trust / brand"], rotation=0)
    add_header(
        fig,
        ax,
        "The same reforms that fixed cost structure damaged brand trust",
        "Directional score from -5 to +5 based on public evidence; this is an analyst judgment matrix, not company-reported data.",
    )
    save(fig, "reform_impact_matrix.png")


def chart_stakeholder_satisfaction():
    rows = [
        ("Banks / debt holders", 4.0, "debt sold near par"),
        ("Musk strategic control", 3.0, "platform now feeds AI strategy"),
        ("Equity co-investors", 1.0, "paper recovery, limited liquidity"),
        ("Power users / creators", 0.5, "more tools, more volatility"),
        ("Advertisers", -2.0, "spend returning, trust not healed"),
        ("Employees / ex-employees", -4.0, "layoffs and legal fallout"),
    ]
    df = pd.DataFrame(rows, columns=["stakeholder", "score", "note"]).sort_values("score")
    fig, ax = plt.subplots(figsize=(10.8, 5.8))
    colors = [FAMILIES["red"]["base"] if v < 0 else FAMILIES["green"]["base"] if v >= 2 else FAMILIES["amber"]["base"] for v in df["score"]]
    edges = [FAMILIES["red"]["dark"] if v < 0 else FAMILIES["green"]["dark"] if v >= 2 else FAMILIES["amber"]["dark"] for v in df["score"]]
    bars = ax.barh(df["stakeholder"], df["score"], color=colors, edgecolor=edges, linewidth=1.0)
    ax.axvline(0, color=TOKENS["ink"], linewidth=1.0)
    for bar, row in zip(bars, df.itertuples()):
        x = row.score + (0.18 if row.score >= 0 else -0.18)
        ha = "left" if row.score >= 0 else "right"
        ax.text(x, bar.get_y() + bar.get_height() / 2, row.note, va="center", ha=ha, fontsize=8.7, color=TOKENS["ink"])
    ax.set_xlim(-5.0, 5.0)
    ax.set_xlabel("Directional satisfaction score")
    ax.xaxis.set_major_locator(mticker.MultipleLocator(1))
    ax.grid(axis="y", visible=False)
    add_header(
        fig,
        ax,
        "Investor satisfaction depends on which investor you mean",
        "Debt holders look much happier; equity investors are conditionally satisfied only if X's AI distribution value keeps compounding.",
    )
    save(fig, "stakeholder_satisfaction.png")


def main() -> None:
    os.environ.setdefault("MPLCONFIGDIR", "/tmp/matplotlib")
    theme()
    chart_ad_revenue()
    chart_valuation()
    chart_reform_matrix()
    chart_stakeholder_satisfaction()


if __name__ == "__main__":
    main()
