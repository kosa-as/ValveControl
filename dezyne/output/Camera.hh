// Generated by dzn code from C:/Users/ticp/Downloads/dezyne/examples/Camera/Camera.dzn
// Dezyne --- Dezyne command line tools
//
// Copyright © 2015, 2022 Rutger van Beusekom <rutger@dezyne.org>
// Copyright © 2015 Rob Wieringa <rma.wieringa@gmail.com>
// Copyright © 2016, 2019, 2020, 2021 Jan (janneke) Nieuwenhuizen <janneke@gnu.org>
// Copyright © 2016, 2018 Paul Hoogendijk <paul@dezyne.org>
//
// This file is part of Dezyne.
//
// Dezyne is free software: you can redistribute it and/or modify it
// under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
//
// Dezyne is distributed in the hope that it will be useful, but
// WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
// Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public
// License along with Dezyne.  If not, see <http://www.gnu.org/licenses/>.
//
// Commentary:
//
// Code:
// camera hardware:
//   lens: focus => ILens
//   shutter => IShutter
//   flash => IFlash
//   sensor acquire image => ISensor
//   memory: store/retrieve image => IMemory
// camera software abstractions:
//   optics: controls the optical path: lens, focus, shutter
//   acquisition: controls the imaging path: sensor, memory
//   driver: relays user control to optics and acquisition
#include <dzn/runtime.hh>
namespace dzn
{
  struct locator;
  struct runtime;
}
#include <iostream>
#include <vector>
#include <map>
#include "Optics.hh"
#include "Acquisition.hh"
#ifndef ICONTROL_HH
#define ICONTROL_HH
struct IControl
{
  enum struct State
    {
      Idle,Setup,Ready,Acquire
    };
  dzn::port::meta dzn_meta;
  struct
    {
      dzn::in::event<void ()> setup;
      dzn::in::event<void ()> shoot;
      dzn::in::event<void ()> release;
    } in;
  struct
    {
      dzn::out::event<void ()> focus_lock;
      dzn::out::event<void ()> image;
    } out;
  bool dzn_share_p;
  char const* dzn_label;
  int dzn_state;
  ::IControl::State state;
  IControl (dzn::port::meta const& m);
  template <typename Component>
  IControl (dzn::port::meta const& m, Component* that)
  : dzn_meta (m)
  , dzn_share_p (true)
  , dzn_label ("")
  , dzn_state ()
  , state (::IControl::State::Idle)
    {
      in.setup.set (that, this, "setup");
      in.shoot.set (that, this, "shoot");
      in.release.set (that, this, "release");
      out.focus_lock.set (that, this, "focus_lock");
      out.image.set (that, this, "image");
    }
  virtual ~IControl ();
  void dzn_event (char const* event);
  void dzn_update_state (dzn::locator const& locator);
  void dzn_check_bindings ();
};
namespace dzn
{
  inline void connect (::IControl& provide, ::IControl& require)
    {
      require.out.focus_lock.other_port_update = provide.out.focus_lock.port_update;
      provide.out.focus_lock = require.out.focus_lock;
      require.out.image.other_port_update = provide.out.image.port_update;
      provide.out.image = require.out.image;
      require.in.setup = provide.in.setup;
      require.in.shoot = provide.in.shoot;
      require.in.release = provide.in.release;
      provide.dzn_meta.require = require.dzn_meta.require;
      require.dzn_meta.provide = provide.dzn_meta.provide;
      provide.dzn_share_p = require.dzn_share_p = provide.dzn_share_p && require.dzn_share_p;
    }
}
#endif // ICONTROL_HH
#ifndef DRIVER_HH
#define DRIVER_HH
#include "Acquisition.hh"
#include "Optics.hh"
struct Driver: public dzn::component
{
  dzn::meta dzn_meta;
  dzn::runtime& dzn_runtime;
  dzn::locator const& dzn_locator;
  std::function<void ()>* dzn_out_control;
  ::IControl control;
  ::IAcquisition acquisition;
  ::IOptics optics;
  Driver (dzn::locator const& locator);
  private:
  void control_setup ();
  void control_shoot ();
  void control_release ();
  void acquisition_image ();
  void optics_ready ();
};
#endif // DRIVER_HH
#ifndef CAMERA_HH
#define CAMERA_HH
#include "Acquisition.hh"
#include "Optics.hh"
struct Camera: public dzn::component
{
  dzn::meta dzn_meta;
  dzn::runtime& dzn_runtime;
  dzn::locator const& dzn_locator;
  ::Driver driver;
  ::Acquisition acquisition;
  ::Optics optics;
  ::IControl& control;
  Camera (dzn::locator const& locator);
};
#endif // CAMERA_HH
// version 2.18.3
