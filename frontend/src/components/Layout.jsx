import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  IconButton,
  Divider,
  Tooltip,
  Collapse,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import LogoutIcon from "@mui/icons-material/Logout";
import PeopleIcon from "@mui/icons-material/People";
import InboxIcon from "@mui/icons-material/Inbox";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import AssignmentIcon from "@mui/icons-material/Assignment";
import AddCardIcon from "@mui/icons-material/AddCard";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import DashboardIcon from "@mui/icons-material/Dashboard";
import AssessmentIcon from "@mui/icons-material/Assessment";
import ScreenSearchDesktopIcon from "@mui/icons-material/ScreenSearchDesktop";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";

import { useState } from "react";
import { getCurrentUser, logout } from "../services/auth";
import ThemeToggle from "./ThemeToggle";
import { useColorScheme } from "@mui/material";

const drawerWidth = 240;

const Layout = () => {
  const user = getCurrentUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [openDrawer, setOpenDrawer] = useState(true);
  const [expandedMenus, setExpandedMenus] = useState({});
  //const { mode, setMode } = useColorScheme();

  const handleToggleDrawer = () => {
    setOpenDrawer((prev) => !prev);
  };

  const handleToggleMenu = (menu) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [menu]: !prev[menu],
    }));
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const getMenuItems = () => {
    if (!user) return [];

    const common = [];

    if (user.role === "ADMIN") {
      common.push(
        {
          text: "Embarques",
          icon: <LocalShippingIcon />,
          key: "shipments",
          subitems: [
            {
              text: "Crear usuarios",
              to: "/admin/users",
              icon: <PeopleIcon />,
            },
            {
              text: "Solicitudes",
              to: "/admin/requests",
              icon: <AssignmentIcon />,
            },
            { text: "Crear Partes", to: "/admin/parts", icon: <AddCardIcon /> },
            {
              text: "Dashboard",
              to: "/admin/dashboard",
              icon: <AssessmentIcon />,
            },
          ],
        },
        {
          text: "Incoming",
          icon: <ReceiptLongIcon />,
          key: "incomings",
          subitems: [
            {
              text: "Crear solicitud",
              to: "/quality/mapping",
              icon: <PeopleIcon />,
            },
          ],
        }
      );
    } else if (user.role === "PLANNER") {
      common.push({
        text: "Embarques",
        icon: <LocalShippingIcon />,
        key: "shipments",
        subitems: [
          {
            text: "Mis Solicitudes",
            to: "/planner/requests",
            icon: <InboxIcon />,
          },
          {
            text: "Nueva Solicitud",
            to: "/planner/request/new",
            icon: <AssignmentIcon />,
          },
          { text: "Crear Partes", to: "/planner/parts", icon: <AddCardIcon /> },
        ],
      });
    } else if (user.role === "WAREHOUSE") {
      // WAREHOUSE
      common.push({
        text: "Embarques",
        icon: <LocalShippingIcon />,
        key: "shipments",
        subitems: [
          {
            text: "Solicitudes",
            to: "/warehouse/requests",
            icon: <AssignmentIcon />,
          },
          {
            text: "Dashboard",
            to: "/warehouse/dashboard",
            icon: <AssessmentIcon />,
          },
          {
            text: "Busqueda",
            to: "/warehouse/allshipmentsdashboard",
            icon: <ScreenSearchDesktopIcon />,
          },
        ],
      });
    } else {
      // WAREHOUSE
      common.push({
        text: "Incomming",
        icon: <ReceiptLongIcon />,
        key: "shipments",
        subitems: [
          {
            text: "Recibo",
            to: "/quality/mapping",
            icon: <AssignmentIcon />,
          },
        ],
      });
    }

    return common;
  };

  return (
    <Box sx={{ display: "flex" }}>
      {/* AppBar superior */}
      <AppBar
        position="fixed"
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleToggleDrawer}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            CONNECT GROUP - FOUR SCREENS
          </Typography>
          {user && (
            <>
              <Typography sx={{ mr: 2 }}>
                {user.fullName} ({user.role})
              </Typography>
              <Tooltip title="Cerrar sesión">
                <IconButton color="inherit" onClick={handleLogout}>
                  <LogoutIcon />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: openDrawer ? drawerWidth : 60,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: openDrawer ? drawerWidth : 60,
            boxSizing: "border-box",
            transition: "width 0.3s",
            overflowX: "hidden",
          },
        }}
      >
        <Toolbar />
        <List>
          {getMenuItems().map((item) => {
            if (item.subitems) {
              const isMenuExpanded = expandedMenus[item.key] ?? true;
              const hasActiveChild = item.subitems.some((sub) =>
                isActive(sub.to)
              );

              return (
                <Box key={item.text}>
                  <ListItem disablePadding>
                    <ListItemButton
                      onClick={() => handleToggleMenu(item.key)}
                      sx={{
                        backgroundColor: hasActiveChild
                          ? "rgba(25, 118, 210, 0.08)"
                          : "inherit",
                        "&:hover": {
                          backgroundColor: "rgba(25, 118, 210, 0.12)",
                        },
                      }}
                    >
                      {item.icon}
                      {openDrawer && (
                        <>
                          <ListItemText sx={{ ml: 2 }} primary={item.text} />
                          {isMenuExpanded ? <ExpandLess /> : <ExpandMore />}
                        </>
                      )}
                    </ListItemButton>
                  </ListItem>
                  <Collapse in={isMenuExpanded} timeout="auto" unmountOnExit>
                    {item.subitems.map((sub) => (
                      <ListItem
                        key={sub.text}
                        disablePadding
                        sx={{ pl: openDrawer ? 4 : 0 }}
                      >
                        <ListItemButton
                          component={Link}
                          to={sub.to}
                          selected={isActive(sub.to)}
                          sx={{
                            "&.Mui-selected": {
                              backgroundColor: "primary.main",
                              color: "primary.contrastText",
                              "&:hover": {
                                backgroundColor: "primary.dark",
                              },
                            },
                          }}
                        >
                          {openDrawer ? (
                            <ListItemText primary={sub.text} />
                          ) : (
                            <Tooltip title={sub.text} placement="right">
                              <Box
                                sx={{
                                  width: "100%",
                                  display: "flex",
                                  justifyContent: "center",
                                }}
                              >
                                {sub.icon}
                              </Box>
                            </Tooltip>
                          )}
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </Collapse>
                  <Divider />
                  {/* <ThemeToggle /> */}
                </Box>
              );
            }

            return (
              <ListItem key={item.text} disablePadding>
                <ListItemButton
                  component={Link}
                  to={item.to}
                  selected={isActive(item.to)}
                  sx={{
                    "&.Mui-selected": {
                      backgroundColor: "primary.main",
                      color: "primary.contrastText",
                      "&:hover": {
                        backgroundColor: "primary.dark",
                      },
                    },
                  }}
                >
                  {item.icon}
                  {openDrawer && (
                    <ListItemText sx={{ ml: 2 }} primary={item.text} />
                  )}
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
        <ThemeToggle />
      </Drawer>

      {/* Contenido principal */}
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;
