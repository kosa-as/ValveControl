// Generated by dzn code from c:/Users/ticp/Downloads/dezyne/examples/controll/ValveController.dzn
#include "ValveController.hh"
#include <dzn/locator.hh>
#include <dzn/runtime.hh>
#include <iterator>
#define STRINGIZING(x) #x
#define STR(x) STRINGIZING (x)
#define LOCATION __FILE__ ":" STR (__LINE__)
ValveController::ValveController (dzn::port::meta const& m)
: dzn_meta (m)
, dzn_share_p (true)
, dzn_label ("")
, dzn_state ()
, s (::ValveController::valveState::Init)
{}
ValveController::~ValveController ()= default;
void
ValveController::dzn_event (char const* event)
{
  if (!dzn_share_p) return;
  dzn_label = event;
}
void
ValveController::dzn_update_state (dzn::locator const& locator)
{
  if (!dzn_share_p || !dzn_label) return;
  switch (dzn::hash (dzn_label, dzn_state))
    {
      case 2860114173u:
      //0:setup
      dzn_state = 1;
      break;
      case 632232382u:
      //1:return
      dzn_state = 2;
      s = ValveController::valveState::Operational;
      break;
      case 2612184518u:
      //2:close
      dzn_state = 1;
      break;
      case 2716776387u:
      //2:open
      dzn_state = 1;
      break;
      default: locator.get<dzn::illegal_handler> ().handle (LOCATION);
    }
}
void
ValveController::dzn_check_bindings ()
{
  if (!this->in.setup) throw dzn::binding_error (this->dzn_meta, "in.setup");
  if (!this->in.open) throw dzn::binding_error (this->dzn_meta, "in.open");
  if (!this->in.close) throw dzn::binding_error (this->dzn_meta, "in.close");
}
namespace dzn
{
}
// version 2.18.3
