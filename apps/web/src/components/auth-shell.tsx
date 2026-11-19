"use client";

import { ReactNode } from "react";
import { Box, Paper, Typography } from "@mui/material";
import { Stack } from "@/components/mui-stack";
import { CheckCircle2, Dumbbell } from "lucide-react";
import { ColorModeToggle } from "@/components/color-mode";

/**
 * Split auth surface: a branded gradient panel on the left, a quiet form card
 * on the right. Collapses to a single column on small screens.
 */
export function AuthShell({
  eyebrow,
  headline,
  points,
  title,
  subtitle,
  children,
  footer,
}: {
  eyebrow: string;
  headline: string;
  points: string[];
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Box sx={{ minHeight: "100vh", display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1.05fr 1fr" } }}>
      <Box
        sx={{
          display: { xs: "none", lg: "flex" },
          flexDirection: "column",
          justifyContent: "space-between",
          position: "relative",
          overflow: "hidden",
          p: 6,
          color: "#ffffff",
          background: "linear-gradient(150deg, #0d1c3d 0%, #1f479f 45%, #3f6fe0 78%, #6d3fd4 100%)",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            opacity: 0.35,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.09) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(70% 70% at 30% 20%, #000 30%, transparent 78%)",
            WebkitMaskImage: "radial-gradient(70% 70% at 30% 20%, #000 30%, transparent 78%)",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            width: 420,
            height: 420,
            right: -140,
            bottom: -120,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,255,255,0.22), transparent 65%)",
          }}
        />

        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ position: "relative" }}>
          <Box
            sx={{
              display: "grid",
              placeItems: "center",
              width: 40,
              height: 40,
              borderRadius: 2.5,
              backgroundColor: "rgba(255,255,255,0.16)",
              border: "1px solid rgba(255,255,255,0.32)",
            }}
          >
            <Dumbbell size={18} strokeWidth={2.1} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: 15, letterSpacing: "-0.01em" }}>GymFlow</Typography>
            <Typography sx={{ fontSize: 11, opacity: 0.75 }}>Member CRM</Typography>
          </Box>
        </Stack>

        <Box sx={{ position: "relative", maxWidth: 460 }}>
          <Typography
            sx={{
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              opacity: 0.7,
              mb: 1.5,
            }}
          >
            {eyebrow}
          </Typography>
          <Typography sx={{ fontSize: 34, lineHeight: 1.12, fontWeight: 700, letterSpacing: "-0.03em" }}>
            {headline}
          </Typography>
          <Stack spacing={1.25} sx={{ mt: 3.5 }}>
            {points.map((point) => (
              <Stack key={point} direction="row" spacing={1.25} alignItems="flex-start">
                <Box sx={{ display: "grid", placeItems: "center", mt: "2px", color: "rgba(255,255,255,0.9)" }}>
                  <CheckCircle2 size={15} strokeWidth={2.2} />
                </Box>
                <Typography sx={{ fontSize: 13, lineHeight: 1.55, opacity: 0.88 }}>{point}</Typography>
              </Stack>
            ))}
          </Stack>

        <Box
          sx={{
            position: "relative",
            mt: 3.5,
            maxWidth: 360,
            p: 2,
            borderRadius: 3,
            border: "1px solid rgba(255,255,255,0.24)",
            backgroundColor: "rgba(255,255,255,0.12)",
            backdropFilter: "blur(8px)",
          }}
        >
          <Typography sx={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", opacity: 0.72 }}>
            Membership pipeline
          </Typography>
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 1.25, flexWrap: "wrap", rowGap: 0.75 }}>
            {["Enquiry", "Tour", "Trial", "Member"].map((stage, index) => (
              <Stack key={stage} direction="row" spacing={0.75} alignItems="center">
                {index > 0 ? <Box sx={{ width: 12, height: 1, backgroundColor: "rgba(255,255,255,0.45)" }} /> : null}
                <Box sx={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.9)" }} />
                <Typography sx={{ fontSize: 11, fontWeight: 600, opacity: 0.9 }}>{stage}</Typography>
              </Stack>
            ))}
          </Stack>
        </Box>
        </Box>

        <Typography sx={{ position: "relative", fontSize: 11, opacity: 0.6 }}>
          One record set for prospects, members, contracts and support.
        </Typography>
      </Box>

      <Box
        sx={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          px: { xs: 2, sm: 4 },
          py: { xs: 6, lg: 8 },
        }}
      >
        <Box sx={{ position: "absolute", top: 16, right: 16 }}>
          <ColorModeToggle />
        </Box>

        <Box sx={{ width: "100%", maxWidth: 420 }}>
          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 3, display: { xs: "flex", lg: "none" } }}>
            <Box
              sx={{
                display: "grid",
                placeItems: "center",
                width: 36,
                height: 36,
                borderRadius: 2,
                background: "linear-gradient(160deg, var(--gf-accent), var(--gf-chart-bar-bottom))",
                color: "#ffffff",
              }}
            >
              <Dumbbell size={17} strokeWidth={2.1} />
            </Box>
            <Typography sx={{ fontWeight: 700, fontSize: 15 }}>GymFlow</Typography>
          </Stack>

          <Typography variant="h1" sx={{ fontSize: { xs: 24, sm: 27 } }}>
            {title}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.75 }}>
            {subtitle}
          </Typography>

          <Paper
            sx={{
              mt: 3,
              borderRadius: 4,
              p: { xs: 2.5, sm: 3.5 },
              boxShadow: (theme) =>
                theme.palette.mode === "dark"
                  ? "0 30px 70px rgba(0,0,0,0.45)"
                  : "0 24px 60px rgba(16,40,84,0.12)",
            }}
          >
            {children}
          </Paper>

          {footer ? <Box sx={{ mt: 2.5, textAlign: "center" }}>{footer}</Box> : null}
        </Box>
      </Box>
    </Box>
  );
}
