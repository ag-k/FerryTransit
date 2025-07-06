import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const url = new URL(req.url)
    const fromPort = url.searchParams.get('from')
    const toPort = url.searchParams.get('to')
    const date = url.searchParams.get('date')

    if (!fromPort || !toPort || !date) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: from, to, date' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Get the day of week (0 = Sunday, 6 = Saturday)
    const queryDate = new Date(date)
    const dayOfWeek = queryDate.getDay()

    // Query timetables with routes
    const { data: timetables, error } = await supabaseClient
      .from('timetables')
      .select(`
        id,
        departure_time,
        arrival_time,
        notes_ja,
        notes_en,
        routes!inner (
          id,
          duration_minutes,
          from_port_id,
          to_port_id,
          ships (
            id,
            code,
            name_ja,
            name_en
          ),
          from_port:ports!routes_from_port_id_fkey (
            id,
            code,
            name_ja,
            name_en
          ),
          to_port:ports!routes_to_port_id_fkey (
            id,
            code,
            name_ja,
            name_en
          )
        )
      `)
      .eq('routes.from_port.code', fromPort)
      .eq('routes.to_port.code', toPort)
      .lte('valid_from', date)
      .or(`valid_until.is.null,valid_until.gte.${date}`)
      .contains('day_of_week', [dayOfWeek])
      .not('excluded_dates', 'cs', `{${date}}`)
      .order('departure_time')

    if (error) {
      console.error('Database error:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch timetables' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    // Check for special schedules on this date
    const { data: specialSchedules } = await supabaseClient
      .from('timetables')
      .select(`
        id,
        departure_time,
        arrival_time,
        notes_ja,
        notes_en,
        routes!inner (
          id,
          duration_minutes,
          from_port_id,
          to_port_id,
          ships (
            id,
            code,
            name_ja,
            name_en
          ),
          from_port:ports!routes_from_port_id_fkey (
            id,
            code,
            name_ja,
            name_en
          ),
          to_port:ports!routes_to_port_id_fkey (
            id,
            code,
            name_ja,
            name_en
          )
        )
      `)
      .eq('routes.from_port.code', fromPort)
      .eq('routes.to_port.code', toPort)
      .eq('is_special_schedule', true)
      .contains('special_dates', [date])
      .order('departure_time')

    // Merge regular and special schedules
    const allSchedules = [...(timetables || []), ...(specialSchedules || [])]
      .sort((a, b) => a.departure_time.localeCompare(b.departure_time))

    // Check for operation alerts
    const { data: alerts } = await supabaseClient
      .from('operation_alerts')
      .select('*')
      .eq('alert_date', date)
      .in('route_id', allSchedules.map(s => s.routes.id))

    // Format response
    const response = {
      date,
      from_port: fromPort,
      to_port: toPort,
      schedules: allSchedules.map(schedule => {
        const alert = alerts?.find(a => a.route_id === schedule.routes.id)
        return {
          ...schedule,
          operation_status: alert ? {
            status: alert.status,
            delay_minutes: alert.delay_minutes,
            reason_ja: alert.reason_ja,
            reason_en: alert.reason_en,
          } : null
        }
      })
    }

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})