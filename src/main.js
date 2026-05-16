import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://ruatzgleuoqnmaacbpet.supabase.co',
  'sb_publishable_5dVAyquuvdCHfSOSxmavYw_QBUvGz-N'
)

const habitsDiv = document.querySelector('#habits')
const form = document.querySelector('#new-habit-form')
const input = document.querySelector('#new-habit-input')

async function loadHabits() {
  const { data, error } = await supabase
    .from('habit-data')
    .select('id, habit_label, num_times_performed, time_most_recently_performed_at')
    .order('num_times_performed', { ascending: false })

  if (error) {
    console.error(error)
    habitsDiv.textContent = 'Error loading habits'
    return
  }

  habitsDiv.innerHTML = ''

  data.forEach((habit) => {
const row = document.createElement('div')
row.className = 'habit-card'

row.innerHTML = `
  <div class="habit-info">
    <div class="habit-title">
      ${habit.habit_label}
    </div>

    <div class="habit-meta">
      ${'X'.repeat(habit.num_times_performed)} - ${habit.num_times_performed}
    </div>

    <div class="habit-meta">
      Last performed:
      ${new Date(
        habit.time_most_recently_performed_at
      ).toLocaleString()}
    </div>
  </div>

  <button class="plus-button">
    +
  </button>
`

    const button = row.querySelector('button')

    button.addEventListener('click', async () => {
      const { error } = await supabase
        .from('habit-data')
        .update({
          num_times_performed: habit.num_times_performed + 1,
          time_most_recently_performed_at: new Date().toISOString()
        })
        .eq('id', habit.id)

      if (error) {
        console.error(error)
        return
      }

      await loadHabits()
    })

    habitsDiv.appendChild(row)
  })
}

form.addEventListener('submit', async (event) => {
  event.preventDefault()

  const habitName = input.value.trim()

  if (!habitName) return

  const { error } = await supabase
    .from('habit-data')
    .insert({
      habit_label: habitName,
      num_times_performed: 0,
      time_most_recently_performed_at: new Date().toISOString(),
      user: 'f4ffff19-dd3c-408c-a653-64b7fa42e1dc',
    })

  if (error) {
    console.error(error)
    return
  }

  input.value = ''
  await loadHabits()
})

loadHabits()