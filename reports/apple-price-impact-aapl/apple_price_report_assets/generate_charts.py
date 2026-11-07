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
    "surface": "#FCFCFD",
    "panel": "#FFFFFF",
    "ink": "#1F2430",
    "muted": "#6F768A",
    "grid": "#E6E8F0",
    "axis": "#D7DBE7",
}

NEUTRAL_MARKS = {
    "open": TOKENS["panel"],
    "xlight": "#F4F5F7",
    "light": "#E2E5EA",
    "base": "#C5CAD3",
    "mid": "#7A828F",
    "dark": "#464C55",
}

COLOR_FAMILIES = {
    "blue": {"open": TOKENS["panel"], "xlight": "#EAF1FE", "light": "#CEDFFE", "base": "#A3BEFA", "mid": "#5477C4", "dark": "#2E4780"},
    "gold": {"open": TOKENS["panel"], "xlight": "#FFF4C2", "light": "#FFEA8F", "base": "#FFE15B", "mid": "#B8A037", "dark": "#736422"},
    "orange": {"open": TOKENS["panel"], "xlight": "#FFEDDE", "light": "#FFBDA1", "base": "#F0986E", "mid": "#CC6F47", "dark": "#804126"},
    "olive": {"open": TOKENS["panel"], "xlight": "#D8ECBD", "light": "#BEEB96", "base": "#A3D576", "mid": "#71B436", "dark": "#386411"},
    "pink": {"open": TOKENS["panel"], "xlight": "#FCDAD6", "light": "#F5BACC", "base": "#F390CA", "mid": "#BD569B", "dark": "#8A3A6F"},
}


def use_chart_theme() -> None:
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


def add_chart_header(fig, ax, title, subtitle, *, title_width=72, subtitle_width=108) -> None:
    title = textwrap.fill(str(title).strip(), width=title_width, break_long_words=False)
    subtitle = textwrap.fill(str(subtitle).strip(), width=subtitle_width, break_long_words=False)
    if not title or not subtitle:
        raise ValueError("Every chart needs a title and subtitle.")
    title_lines = title.count("\n") + 1
    subtitle_lines = subtitle.count("\n") + 1
    ax.set_title("")
    fig.subplots_adjust(top=max(0.62, 0.86 - 0.045 * (title_lines - 1) - 0.032 * (subtitle_lines - 1)))
    left = ax.get_position().x0
    fig.text(left, 0.985, title, ha="left", va="top", fontsize=14, fontweight="semibold", color=TOKENS["ink"], linespacing=1.08)
    fig.text(left, 0.925 - 0.045 * (title_lines - 1), subtitle, ha="left", va="top", fontsize=9.5, color=TOKENS["muted"], linespacing=1.18)
    sns.despine(ax=ax)


def save(fig, name):
    fig.savefig(os.path.join(OUT_DIR, name), dpi=220, bbox_inches="tight", pad_inches=0.15)
    plt.close(fig)


def chart_price_hikes():
    data = [
        ("Apple TV", 129, 199),
        ("Mac Studio M3 Ultra", 3999, 5299),
        ("HomePod mini", 99, 129),
        ("iPad", 349, 449),
        ("iPad Air", 599, 749),
        ("Mac Studio M4 Max", 1999, 2499),
        ("iPad mini", 499, 599),
        ("iPad Pro", 999, 1199),
        ("MacBook Air", 1099, 1299),
        ("MacBook Pro", 1699, 1999),
        ("HomePod", 299, 349),
        ("MacBook Neo", 599, 699),
        ("iMac", 1299, 1499),
        ("Mac mini", 1399, 1599),
        ("Vision Pro", 3499, 3699),
    ]
    df = pd.DataFrame(data, columns=["product", "old_price", "new_price"])
    df["increase_pct"] = (df["new_price"] / df["old_price"] - 1) * 100
    df["increase_dollar"] = df["new_price"] - df["old_price"]
    df = df.sort_values("increase_pct", ascending=True)
    fig, ax = plt.subplots(figsize=(10.8, 7.0))
    family = COLOR_FAMILIES["orange"]
    colors = [family["xlight"] if v < 15 else family["light"] if v < 25 else family["base"] for v in df["increase_pct"]]
    bars = ax.barh(df["product"], df["increase_pct"], color=colors, edgecolor=family["dark"], linewidth=1.0)
    for bar, pct, dollars in zip(bars, df["increase_pct"], df["increase_dollar"]):
        ax.text(pct + 1.0, bar.get_y() + bar.get_height() / 2, f"+{pct:.1f}%  (+${dollars:,.0f})", va="center", ha="left", fontsize=8.5, color=TOKENS["ink"], fontfamily=MONO_FONT_FAMILY)
    ax.set_xlim(0, 60)
    ax.set_xlabel("Price increase")
    ax.xaxis.set_major_formatter(mticker.PercentFormatter())
    ax.grid(axis="y", visible=False)
    add_chart_header(fig, ax, "Product price increases are broad, not isolated", "Apple U.S. listed price changes reported June 25, 2026; percent change from prior starting price.")
    save(fig, "price_hikes.png")


def chart_revenue_mix():
    df = pd.DataFrame(
        [
            ("iPhone", 56.994, COLOR_FAMILIES["blue"]),
            ("Services", 30.976, COLOR_FAMILIES["olive"]),
            ("Mac + iPad", 8.399 + 6.914, COLOR_FAMILIES["orange"]),
            ("Wearables/Home", 7.901, COLOR_FAMILIES["pink"]),
        ],
        columns=["segment", "revenue", "family"],
    )
    total = df["revenue"].sum()
    df["share"] = df["revenue"] / total * 100
    df = df.sort_values("share", ascending=True)
    fig, ax = plt.subplots(figsize=(10.8, 4.8))
    for i, row in enumerate(df.itertuples()):
        family = row.family
        ax.barh(row.segment, row.share, color=family["base"], edgecolor=family["dark"], linewidth=1.0)
        ax.text(row.share + 1.0, i, f"{row.share:.1f}%  (${row.revenue:.1f}B)", va="center", ha="left", fontsize=9, color=TOKENS["ink"], fontfamily=MONO_FONT_FAMILY)
    ax.set_xlim(0, 58)
    ax.set_xlabel("Share of net sales")
    ax.xaxis.set_major_formatter(mticker.PercentFormatter())
    ax.grid(axis="y", visible=False)
    add_chart_header(fig, ax, "Mac + iPad are only 13.8% of sales", "Apple Q2 FY26 segment revenue: iPhone $57.0B, Services $31.0B, Mac + iPad $15.3B, Wearables/Home $7.9B.")
    save(fig, "revenue_mix.png")


def chart_scenarios():
    current_price = 283.78
    rows = [
        ("Bear", 210, 240, 8.80, "iPhone demand slips; multiple de-rates"),
        ("Base", 270, 315, 9.65, "cost pass-through works; Services offsets"),
        ("Bull", 345, 395, 10.70, "AI upgrade cycle + margin recovery"),
    ]
    df = pd.DataFrame(rows, columns=["scenario", "low", "high", "eps", "note"])
    df["mid"] = (df["low"] + df["high"]) / 2
    y = np.arange(len(df))
    fig, ax = plt.subplots(figsize=(10.8, 4.8))
    families = [COLOR_FAMILIES["orange"], COLOR_FAMILIES["blue"], COLOR_FAMILIES["olive"]]
    for i, row in df.iterrows():
        family = families[i]
        ax.plot([row["low"], row["high"]], [y[i], y[i]], color=family["dark"], linewidth=7, solid_capstyle="round", alpha=0.78)
        ax.scatter(row["mid"], y[i], s=130, color=family["base"], edgecolor=family["dark"], linewidth=1.2, zorder=4)
        ax.text(row["high"] + 5, y[i], f"${row['low']:.0f}-${row['high']:.0f} | EPS ${row['eps']:.2f}", va="center", ha="left", fontsize=8.8, color=TOKENS["ink"], fontfamily=MONO_FONT_FAMILY)
    ax.axvline(current_price, color=TOKENS["ink"], linewidth=1.0, linestyle=":", label=f"Latest price ${current_price:.2f}")
    ax.text(current_price + 3, 1.35, "Latest\n$283.78", ha="left", va="center", fontsize=8.2, color=TOKENS["ink"], fontfamily=MONO_FONT_FAMILY)
    ax.set_yticks(y, df["scenario"])
    ax.set_xlim(185, 410)
    ax.set_xlabel("Implied AAPL price range")
    ax.xaxis.set_major_formatter(mticker.StrMethodFormatter("${x:,.0f}"))
    ax.grid(axis="y", visible=False)
    add_chart_header(fig, ax, "Valuation is balanced between base-case support and de-rating risk", "Illustrative 12-24 month price zones using FY27 EPS sensitivity and forward P/E ranges; not a price target.")
    save(fig, "valuation_scenarios.png")


def chart_trigger_heatmap():
    rows = [
        ("iPhone price action", 5, 4),
        ("Unit demand / channel checks", 5, 5),
        ("Services growth", 4, 3),
        ("Product gross margin", 4, 4),
        ("AI upgrade narrative", 3, 5),
        ("China / regulation", 3, 4),
    ]
    df = pd.DataFrame(rows, columns=["factor", "earnings_sensitivity", "multiple_sensitivity"])
    matrix = df.set_index("factor")[["earnings_sensitivity", "multiple_sensitivity"]]
    fig, ax = plt.subplots(figsize=(8.8, 5.8))
    cmap = sns.blend_palette([TOKENS["panel"], COLOR_FAMILIES["gold"]["light"], COLOR_FAMILIES["orange"]["base"], COLOR_FAMILIES["orange"]["dark"]], as_cmap=True)
    sns.heatmap(matrix, ax=ax, cmap=cmap, linewidths=1.0, linecolor=TOKENS["panel"], annot=True, fmt=".0f", vmin=1, vmax=5, cbar=False, annot_kws={"fontsize": 10, "fontweight": "semibold", "color": TOKENS["ink"]})
    ax.set_xlabel("")
    ax.set_ylabel("")
    ax.set_xticklabels(["Earnings sensitivity", "Multiple sensitivity"], rotation=0)
    add_chart_header(fig, ax, "iPhone demand remains the decisive trigger", "Qualitative 1-5 sensitivity score for the next 1-3 years based on public financial mix and investor narrative risk.")
    save(fig, "trigger_heatmap.png")


def main():
    os.environ.setdefault("MPLCONFIGDIR", "/tmp/matplotlib")
    use_chart_theme()
    chart_price_hikes()
    chart_revenue_mix()
    chart_scenarios()
    chart_trigger_heatmap()


if __name__ == "__main__":
    main()
